import { asValue } from 'awilix';
import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '@/config.js';
import { OrgTreeController } from '@/controllers/org-tree.controller.js';
import { createAppContainer } from '@/di/container.js';
import { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import { InMemoryOrgNodeRepository } from '@/repositories/org-node.repository.js';
import { orgNodesSeed } from '@/seeds/org-nodes.seed.js';
import { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import { LiveUpdatesGateway } from '@/gateways/live-updates.gateway.js';
import { LiveUpdateSimulator } from '@/services/live-update-simulator.js';
import { OrgTreeService } from '@/services/org-tree.service.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

const config = loadConfig({ PORT: '9000' });

describe('createAppContainer', () => {
  it('registers every application dependency', () => {
    const container = createAppContainer(config);

    expect(Object.keys(container.registrations).sort()).toEqual(
      [
        'clock',
        'config',
        'liveUpdateSimulator',
        'liveUpdatesGateway',
        'orgNodeMapper',
        'orgNodeRepository',
        'orgNodesSeed',
        'orgTreeChangeBus',
        'orgTreeController',
        'orgTreeService',
        'random',
      ],
    );
  });

  it('resolves concrete implementations', () => {
    const container = createAppContainer(config);

    expect(container.resolve('config')).toEqual(config);
    expect(container.resolve('orgNodesSeed')).toBe(orgNodesSeed);
    expect(container.resolve('orgNodeRepository')).toBeInstanceOf(InMemoryOrgNodeRepository);
    expect(container.resolve('orgNodeMapper')).toBeInstanceOf(OrgNodeMapper);
    expect(container.resolve('orgTreeService')).toBeInstanceOf(OrgTreeService);
    expect(container.resolve('orgTreeController')).toBeInstanceOf(OrgTreeController);
    expect(container.resolve('orgTreeChangeBus')).toBeInstanceOf(OrgTreeChangeBus);
    expect(container.resolve('liveUpdateSimulator')).toBeInstanceOf(LiveUpdateSimulator);
    expect(container.resolve('liveUpdatesGateway')).toBeInstanceOf(LiveUpdatesGateway);
    expect(container.resolve('random')).toBe(Math.random);
    expect(container.resolve('clock')()).toBeInstanceOf(Date);
  });

  it('shares one change bus between the service and the gateway', () => {
    const container = createAppContainer(config);
    const bus = container.resolve('orgTreeChangeBus');
    expect(container.resolve('orgTreeChangeBus')).toBe(bus);
  });

  it('stops the simulator and closes the gateway when the container is disposed', async () => {
    const container = createAppContainer(config);
    const simulator = container.resolve('liveUpdateSimulator');
    const gateway = container.resolve('liveUpdatesGateway');
    const close = vi.spyOn(gateway, 'close');
    simulator.start();

    await container.dispose();

    expect(simulator.isRunning).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('shares singletons across resolutions', () => {
    const container = createAppContainer(config);

    expect(container.resolve('orgTreeService')).toBe(container.resolve('orgTreeService'));
    expect(container.resolve('orgNodeRepository')).toBe(container.resolve('orgNodeRepository'));
  });

  it('isolates state between containers', () => {
    expect(createAppContainer(config).resolve('orgTreeService')).not.toBe(
      createAppContainer(config).resolve('orgTreeService'),
    );
  });

  it('wires the service to the repository built from the seed', async () => {
    const service = createAppContainer(config).resolve('orgTreeService');
    await expect(service.getSnapshot()).resolves.toMatchObject({ version: 0, nodes: expect.any(Array) });
    expect((await service.getSnapshot()).nodes).toHaveLength(orgNodesSeed.length);
  });

  it('lets a registration be overridden before resolution', async () => {
    const container = createAppContainer(config);
    const nodes = [makeNode({ id: 'only' })];
    container.register('orgNodesSeed', asValue(nodes));

    await expect(container.resolve('orgTreeService').getSnapshot()).resolves.toEqual({ version: 0, nodes });
  });

  it('injects an overridden service into the controller', () => {
    const container = createAppContainer(config);
    const stub = { getSnapshot: vi.fn(), getVersion: vi.fn(), applyChanges: vi.fn() };
    container.register('orgTreeService', asValue(stub));

    const controller = container.resolve('orgTreeController');
    expect((controller as unknown as { orgTreeService: unknown }).orgTreeService).toBe(stub);
  });
});
