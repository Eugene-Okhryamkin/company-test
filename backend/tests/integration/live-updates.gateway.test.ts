import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { loadConfig } from '@/config.js';
import { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import { LIVE_UPDATES_PATH, LiveUpdatesGateway } from '@/gateways/live-updates.gateway.js';
import { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import { InMemoryOrgNodeRepository } from '@/repositories/org-node.repository.js';
import { OrgTreeService } from '@/services/org-tree.service.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

type Message = { type: string; version: number; [key: string]: unknown };

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function startGateway(env: NodeJS.ProcessEnv = {}) {
  const orgTreeChangeBus = new OrgTreeChangeBus();
  const orgTreeService = new OrgTreeService({
    orgNodeRepository: new InMemoryOrgNodeRepository({
      orgNodesSeed: [makeNode({ id: 'd1' }), makeNode({ id: 'd1-1', parentId: 'd1' })],
    }),
    orgTreeChangeBus,
    clock: () => new Date('2026-09-15T10:00:00.000Z'),
  });
  const gateway = new LiveUpdatesGateway({
    orgTreeChangeBus,
    orgTreeService,
    orgNodeMapper: new OrgNodeMapper(),
    config: loadConfig({ LIVE_HEARTBEAT_INTERVAL_MS: '60000', ...env }),
  });
  const server: Server = createServer((_req, res) => res.writeHead(404).end());
  gateway.attach(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
    () => gateway.close(),
  );
  const { port } = server.address() as AddressInfo;
  return { gateway, orgTreeService, orgTreeChangeBus, url: `ws://127.0.0.1:${port}` };
}

/** Connects and buffers every message, so none are lost between awaits. */
async function connect(url: string, options: WebSocket.ClientOptions = {}) {
  const socket = new WebSocket(url, options);
  const inbox: Message[] = [];
  const waiters: ((message: Message) => void)[] = [];
  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as Message;
    const waiter = waiters.shift();
    if (waiter) waiter(message);
    else inbox.push(message);
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
  cleanups.push(() => {
    socket.terminate();
  });
  const next = () =>
    new Promise<Message>((resolve) => {
      const buffered = inbox.shift();
      if (buffered) resolve(buffered);
      else waiters.push(resolve);
    });
  return { socket, next };
}

describe('LiveUpdatesGateway', () => {
  it(`serves WebSocket connections on ${LIVE_UPDATES_PATH}`, () => {
    expect(LIVE_UPDATES_PATH).toBe('/api/live');
  });

  it('greets a new client with the current version and heartbeat interval', async () => {
    const { url, orgTreeService } = await startGateway();
    await orgTreeService.applyChanges([{ id: 'd1', fields: { headcount: 1 } }]);

    const client = await connect(`${url}${LIVE_UPDATES_PATH}`);

    expect(await client.next()).toEqual({ type: 'hello', version: 1, heartbeatIntervalMs: 60000 });
  });

  it('broadcasts every applied change as a versioned patch to all clients', async () => {
    const { url, orgTreeService, gateway } = await startGateway();
    const a = await connect(`${url}${LIVE_UPDATES_PATH}`);
    const b = await connect(`${url}${LIVE_UPDATES_PATH}`);
    await a.next();
    await b.next();
    expect(gateway.clientCount).toBe(2);

    await orgTreeService.applyChanges([{ id: 'd1-1', fields: { performance: 77.5 } }]);

    const expected = {
      type: 'patch',
      version: 1,
      nodes: [
        { id: 'd1-1', headcount: 10, budget: 1_000_000, performance: 77.5, updatedAt: '2026-09-15T10:00:00.000Z' },
      ],
    };
    expect(await a.next()).toEqual(expected);
    expect(await b.next()).toEqual(expected);
  });

  it('sends heartbeats carrying the current version', async () => {
    const { url } = await startGateway({ LIVE_HEARTBEAT_INTERVAL_MS: '50' });
    const client = await connect(`${url}${LIVE_UPDATES_PATH}`);
    await client.next();

    expect(await client.next()).toEqual({ type: 'heartbeat', version: 0 });
  });

  it('terminates clients that stop answering pings', async () => {
    const { url, gateway } = await startGateway({ LIVE_HEARTBEAT_INTERVAL_MS: '30' });
    const client = await connect(`${url}${LIVE_UPDATES_PATH}`, { autoPong: false });

    const closed = new Promise<void>((resolve) => client.socket.once('close', () => resolve()));
    await closed;

    // The peer observes its close before ws removes it from the server's client set.
    // Assert the gateway's eventual state rather than racing that asynchronous bookkeeping.
    await expect.poll(() => gateway.clientCount, { interval: 1, timeout: 100 }).toBe(0);
  });

  it('rejects upgrades on other paths', async () => {
    const { url } = await startGateway();
    const socket = new WebSocket(`${url}/api/other`);

    const error = await new Promise<Error>((resolve) => socket.once('error', resolve));
    expect(error.message).toMatch(/404/);
  });

  it('closes all connections and stops broadcasting on close()', async () => {
    const { url, gateway, orgTreeChangeBus } = await startGateway();
    const client = await connect(`${url}${LIVE_UPDATES_PATH}`);
    await client.next();
    const closed = new Promise<void>((resolve) => client.socket.once('close', () => resolve()));

    await gateway.close();

    await closed;
    expect(orgTreeChangeBus.subscriberCount).toBe(0);
  });

  it('can be closed more than once, and before it was attached', async () => {
    const { gateway } = await startGateway();
    await gateway.close();
    await expect(gateway.close()).resolves.toBeUndefined();

    const detached = new LiveUpdatesGateway({
      orgTreeChangeBus: new OrgTreeChangeBus(),
      orgTreeService: { getSnapshot: vi.fn(), getVersion: () => 0 },
      orgNodeMapper: new OrgNodeMapper(),
      config: loadConfig({}),
    });
    await expect(detached.close()).resolves.toBeUndefined();
  });

  it('logs socket errors of a client instead of crashing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { url } = await startGateway();
    const client = await connect(`${url}${LIVE_UPDATES_PATH}`);
    await client.next();

    // An invalid (unmasked) frame makes the server-side socket emit an error.
    (client.socket as unknown as { _socket: import('node:net').Socket })._socket.write(Buffer.from([0x81, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f]));

    await expect.poll(() => (console.error as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0);
  });

  it('does not send to clients that are no longer open', async () => {
    const { url, orgTreeService, gateway } = await startGateway({ LIVE_HEARTBEAT_INTERVAL_MS: '20' });
    const client = await connect(`${url}${LIVE_UPDATES_PATH}`);
    await client.next();
    client.socket.close();

    await orgTreeService.applyChanges([{ id: 'd1', fields: { headcount: 3 } }]);

    await expect.poll(() => gateway.clientCount).toBe(0);
  });
});
