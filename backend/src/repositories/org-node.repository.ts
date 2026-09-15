import type { OrgNode } from '@/models/org-node.model.js';

export interface OrgNodeRepository {
  findAll(): Promise<OrgNode[]>;
  /** Replaces stored nodes with the same ids. Unknown ids are ignored. */
  saveMany(nodes: readonly OrgNode[]): Promise<void>;
}

export interface InMemoryOrgNodeRepositoryDeps {
  orgNodesSeed: readonly OrgNode[];
}

const cloneNode = (node: OrgNode): OrgNode => ({ ...node, updatedAt: new Date(node.updatedAt) });

/** Stores nodes in process memory. Every read and write goes through defensive copies. */
export class InMemoryOrgNodeRepository implements OrgNodeRepository {
  private readonly nodes: OrgNode[];
  private readonly indexById = new Map<string, number>();

  constructor({ orgNodesSeed }: InMemoryOrgNodeRepositoryDeps) {
    this.nodes = orgNodesSeed.map(cloneNode);
    this.nodes.forEach((node, index) => this.indexById.set(node.id, index));
  }

  async findAll(): Promise<OrgNode[]> {
    return this.nodes.map(cloneNode);
  }

  async saveMany(nodes: readonly OrgNode[]): Promise<void> {
    for (const node of nodes) {
      const index = this.indexById.get(node.id);
      if (index !== undefined) this.nodes[index] = cloneNode(node);
    }
  }
}
