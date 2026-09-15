import type { AppConfig } from '@/config.js';
import type { OrgNode } from '@/models/org-node.model.js';
import type { OrgNodeChange, OrgNodeMetrics } from '@/models/org-tree-patch.model.js';
import type { OrgTreeReader, OrgTreeWriter } from '@/services/org-tree.service.js';

const BUDGET_STEP = 10_000;
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Produces a plausible small change of a node's metrics. Always valid, and performance always
 * moves by 0.5–3 points (bouncing back from the 0/100 bounds), so every tick is visible.
 */
export function mutateMetrics(node: OrgNode, random: () => number): OrgNodeMetrics {
  const step = 0.5 + random() * 2.5;
  const direction = random() < 0.5 ? -1 : 1;
  let performance = node.performance + direction * step;
  if (performance < 0 || performance > 100) performance = node.performance - direction * step;
  performance = Math.min(100, Math.max(0, round1(performance)));

  const headcountRoll = random();
  const headcountDelta = headcountRoll < 0.2 ? -1 : headcountRoll > 0.8 ? 1 : 0;
  const headcount = Math.max(0, node.headcount + headcountDelta);

  const budgetFactor = 1 + (random() - 0.5) * 0.06; // ±3 %
  const budget = Math.max(0, Math.round((node.budget * budgetFactor) / BUDGET_STEP) * BUDGET_STEP);

  return { headcount, budget, performance };
}

export interface LiveUpdateSimulatorDeps {
  orgTreeService: OrgTreeReader & OrgTreeWriter;
  config: AppConfig;
  random: () => number;
}

/** Mock real-time data source: periodically changes a few random nodes through the service. */
export class LiveUpdateSimulator {
  private readonly orgTreeService: OrgTreeReader & OrgTreeWriter;
  private readonly config: AppConfig;
  private readonly random: () => number;
  private timer: NodeJS.Timeout | null = null;

  constructor({ orgTreeService, config, random }: LiveUpdateSimulatorDeps) {
    this.orgTreeService = orgTreeService;
    this.config = config;
    this.random = random;
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((error: unknown) => console.error('[backend] live update tick failed:', error));
    }, this.config.liveUpdates.intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** One simulation step: 1…maxNodesPerTick distinct random nodes get new metrics. */
  async tick(): Promise<void> {
    const { nodes } = await this.orgTreeService.getSnapshot();
    if (nodes.length === 0) return;

    const count = Math.min(nodes.length, 1 + Math.floor(this.random() * this.config.liveUpdates.maxNodesPerTick));
    const pool = [...nodes];
    const changes: OrgNodeChange[] = [];
    for (let index = 0; index < count; index += 1) {
      // Partial Fisher–Yates shuffle → distinct nodes.
      const pick = index + Math.floor(this.random() * (pool.length - index));
      [pool[index], pool[pick]] = [pool[pick]!, pool[index]!];
      const node = pool[index]!;
      changes.push({ id: node.id, fields: mutateMetrics(node, this.random) });
    }

    await this.orgTreeService.applyChanges(changes);
  }
}
