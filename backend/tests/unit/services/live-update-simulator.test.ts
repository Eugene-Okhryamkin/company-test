import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '@/config.js';
import { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import { InMemoryOrgNodeRepository } from '@/repositories/org-node.repository.js';
import { LiveUpdateSimulator, mutateMetrics } from '@/services/live-update-simulator.js';
import { OrgTreeService } from '@/services/org-tree.service.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

/** Deterministic pseudo-random sequence in [0, 1). */
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length]!;
};

const seed = [
  makeNode({ id: 'a', headcount: 10, budget: 1_000_000, performance: 50 }),
  makeNode({ id: 'b', headcount: 0, budget: 0, performance: 0 }),
  makeNode({ id: 'c', headcount: 3, budget: 500_000, performance: 100 }),
];

function createSimulator(random: () => number, env: NodeJS.ProcessEnv = {}) {
  const orgTreeService = new OrgTreeService({
    orgNodeRepository: new InMemoryOrgNodeRepository({ orgNodesSeed: seed }),
    orgTreeChangeBus: new OrgTreeChangeBus(),
  });
  const config = loadConfig({ LIVE_UPDATE_INTERVAL_MS: '1000', LIVE_UPDATE_MAX_NODES: '2', ...env });
  return { simulator: new LiveUpdateSimulator({ orgTreeService, config, random }), orgTreeService };
}

describe('mutateMetrics', () => {
  it.each([0, 0.25, 0.5, 0.75, 0.999])('keeps every metric valid (random = %s)', (value) => {
    for (const node of seed) {
      const fields = mutateMetrics(node, () => value);
      expect(Number.isInteger(fields.headcount)).toBe(true);
      expect(fields.headcount).toBeGreaterThanOrEqual(0);
      expect(fields.budget).toBeGreaterThanOrEqual(0);
      expect(fields.budget % 10_000).toBe(0);
      expect(fields.performance).toBeGreaterThanOrEqual(0);
      expect(fields.performance).toBeLessThanOrEqual(100);
      expect(Math.round(fields.performance * 10)).toBeCloseTo(fields.performance * 10, 6);
    }
  });

  it('always changes performance so every tick produces a visible update', () => {
    for (const value of [0, 0.3, 0.7, 0.99]) {
      expect(mutateMetrics(seed[0]!, () => value).performance).not.toBe(50);
    }
  });

  it('moves performance inwards at the bounds', () => {
    expect(mutateMetrics(seed[1]!, () => 0).performance).toBeGreaterThan(0);
    expect(mutateMetrics(seed[2]!, () => 0.99).performance).toBeLessThan(100);
  });
});

describe('LiveUpdateSimulator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('changes between 1 and maxNodesPerTick distinct nodes per tick', async () => {
    const { simulator, orgTreeService } = createSimulator(sequence(0.99, 0.1, 0.1, 0.6, 0.4, 0.2, 0.8));
    const apply = vi.spyOn(orgTreeService, 'applyChanges');

    await simulator.tick();

    const changes = apply.mock.calls[0]![0];
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes.length).toBeLessThanOrEqual(2);
    expect(new Set(changes.map((c) => c.id)).size).toBe(changes.length);
    expect(orgTreeService.getVersion()).toBe(1);
  });

  it('ticks on the configured interval once started, and stops', async () => {
    const { simulator, orgTreeService } = createSimulator(sequence(0.3, 0.6, 0.9));

    simulator.start();
    expect(simulator.isRunning).toBe(true);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(orgTreeService.getVersion()).toBe(3);

    simulator.stop();
    expect(simulator.isRunning).toBe(false);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(orgTreeService.getVersion()).toBe(3);
  });

  it('can be stopped before it was started', () => {
    const { simulator } = createSimulator(sequence(0.5));
    expect(() => simulator.stop()).not.toThrow();
    expect(simulator.isRunning).toBe(false);
  });

  it('does not start twice', async () => {
    const { simulator, orgTreeService } = createSimulator(sequence(0.3, 0.6));

    simulator.start();
    simulator.start();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(orgTreeService.getVersion()).toBe(1);
    simulator.stop();
  });

  it('logs and survives a failing tick', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { simulator, orgTreeService } = createSimulator(sequence(0.5));
    vi.spyOn(orgTreeService, 'applyChanges').mockRejectedValueOnce(new Error('boom'));

    simulator.start();
    await vi.advanceTimersByTimeAsync(2_000);
    simulator.stop();

    expect(console.error).toHaveBeenCalled();
    expect(orgTreeService.getVersion()).toBe(1);
  });

  it('does nothing when there are no nodes', async () => {
    const orgTreeService = new OrgTreeService({
      orgNodeRepository: new InMemoryOrgNodeRepository({ orgNodesSeed: [] }),
      orgTreeChangeBus: new OrgTreeChangeBus(),
    });
    const simulator = new LiveUpdateSimulator({ orgTreeService, config: loadConfig({}), random: Math.random });

    await simulator.tick();
    expect(orgTreeService.getVersion()).toBe(0);
  });
});
