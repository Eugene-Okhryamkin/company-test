import type { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import type { OrgNode } from '@/models/org-node.model.js';
import type { OrgNodeChange, OrgTreePatch } from '@/models/org-tree-patch.model.js';
import type { OrgNodeRepository } from '@/repositories/org-node.repository.js';
import { validateOrgNodeFields, validateOrgNodes } from '@/services/org-tree.validator.js';

export interface OrgTreeSnapshot {
  /** Monotonic data version: +1 for every applied batch of changes. */
  version: number;
  nodes: OrgNode[];
}

export interface OrgTreeReader {
  getSnapshot(): Promise<OrgTreeSnapshot>;
  getVersion(): number;
}

export interface OrgTreeWriter {
  applyChanges(changes: readonly OrgNodeChange[]): Promise<OrgTreePatch | null>;
}

export type OrgTreeServiceApi = OrgTreeReader & OrgTreeWriter;

export class OrgNodeNotFoundError extends Error {
  constructor(id: string) {
    super(`Org node "${id}" not found`);
    this.name = 'OrgNodeNotFoundError';
  }
}

export interface OrgTreeServiceDeps {
  orgNodeRepository: OrgNodeRepository;
  orgTreeChangeBus: OrgTreeChangeBus;
  clock?: () => Date;
}

export class OrgTreeService implements OrgTreeServiceApi {
  private readonly orgNodeRepository: OrgNodeRepository;
  private readonly orgTreeChangeBus: OrgTreeChangeBus;
  private readonly clock: () => Date;
  private version = 0;

  constructor({ orgNodeRepository, orgTreeChangeBus, clock = () => new Date() }: OrgTreeServiceDeps) {
    this.orgNodeRepository = orgNodeRepository;
    this.orgTreeChangeBus = orgTreeChangeBus;
    this.clock = clock;
  }

  getVersion(): number {
    return this.version;
  }

  /** The org structure as a flat list plus its version; guarantees tree integrity. */
  async getSnapshot(): Promise<OrgTreeSnapshot> {
    const nodes = await this.orgNodeRepository.findAll();
    const version = this.version;
    validateOrgNodes(nodes);
    return { version, nodes };
  }

  /**
   * Applies a batch of metric changes atomically: every change is validated before anything is
   * stored. A successful batch bumps the version by one and is published to subscribers.
   */
  async applyChanges(changes: readonly OrgNodeChange[]): Promise<OrgTreePatch | null> {
    if (changes.length === 0) return null;

    const current = new Map((await this.orgNodeRepository.findAll()).map((node) => [node.id, node]));
    const updatedAt = this.clock();
    const updated = new Map<string, OrgNode>();

    for (const { id, fields } of changes) {
      const base = updated.get(id) ?? current.get(id);
      if (!base) throw new OrgNodeNotFoundError(id);
      const next: OrgNode = { ...base, ...fields, updatedAt };
      validateOrgNodeFields(next);
      updated.set(id, next);
    }

    const nodes = [...updated.values()];
    await this.orgNodeRepository.saveMany(nodes);
    this.version += 1;

    const patch: OrgTreePatch = { version: this.version, nodes };
    this.orgTreeChangeBus.publish(patch);
    return patch;
  }
}
