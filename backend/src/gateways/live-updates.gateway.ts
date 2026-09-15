import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import type { AppConfig } from '@/config.js';
import type { LiveMessageDto } from '@/dto/live-message.dto.js';
import type { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import type { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import type { OrgTreeReader } from '@/services/org-tree.service.js';

export const LIVE_UPDATES_PATH = '/api/live';

export interface LiveUpdatesGatewayDeps {
  orgTreeChangeBus: OrgTreeChangeBus;
  orgTreeService: OrgTreeReader;
  orgNodeMapper: OrgNodeMapper;
  config: AppConfig;
}

/**
 * WebSocket transport for live updates (the "view" of the real-time channel).
 * - hello on connect: current version + heartbeat interval;
 * - every published change → versioned patch to all clients;
 * - heartbeat: protocol ping (dead clients are terminated) + app-level message with the version,
 *   so browsers (which cannot see pings) can detect a silent connection and missed versions.
 */
export class LiveUpdatesGateway {
  private readonly orgTreeChangeBus: OrgTreeChangeBus;
  private readonly orgTreeService: OrgTreeReader;
  private readonly orgNodeMapper: OrgNodeMapper;
  private readonly config: AppConfig;
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly alive = new WeakMap<WebSocket, boolean>();
  private server: Server | null = null;
  private unsubscribe: (() => void) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor({ orgTreeChangeBus, orgTreeService, orgNodeMapper, config }: LiveUpdatesGatewayDeps) {
    this.orgTreeChangeBus = orgTreeChangeBus;
    this.orgTreeService = orgTreeService;
    this.orgNodeMapper = orgNodeMapper;
    this.config = config;
  }

  get clientCount(): number {
    return this.wss.clients.size;
  }

  attach(server: Server): void {
    this.server = server;
    server.on('upgrade', this.handleUpgrade);
    this.unsubscribe = this.orgTreeChangeBus.subscribe((patch) =>
      this.broadcast(this.orgNodeMapper.toPatchMessage(patch)),
    );
    this.heartbeatTimer = setInterval(() => this.heartbeat(), this.config.liveUpdates.heartbeatIntervalMs);
    this.heartbeatTimer.unref();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.unsubscribe?.();
    this.server?.off('upgrade', this.handleUpgrade);
    for (const client of this.wss.clients) client.terminate();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }

  private readonly handleUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    if (pathname !== LIVE_UPDATES_PATH) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    this.wss.handleUpgrade(request, socket, head, (client) => this.handleConnection(client));
  };

  private handleConnection(client: WebSocket): void {
    this.alive.set(client, true);
    client.on('pong', () => this.alive.set(client, true));
    client.on('error', (error) => console.error('[backend] live client error:', error));
    this.send(client, {
      type: 'hello',
      version: this.orgTreeService.getVersion(),
      heartbeatIntervalMs: this.config.liveUpdates.heartbeatIntervalMs,
    });
  }

  private heartbeat(): void {
    const message: LiveMessageDto = { type: 'heartbeat', version: this.orgTreeService.getVersion() };
    for (const client of this.wss.clients) {
      if (this.alive.get(client) === false) {
        client.terminate();
        continue;
      }
      this.alive.set(client, false);
      client.ping();
      this.send(client, message);
    }
  }

  private broadcast(message: LiveMessageDto): void {
    const data = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }

  private send(client: WebSocket, message: LiveMessageDto): void {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
  }
}
