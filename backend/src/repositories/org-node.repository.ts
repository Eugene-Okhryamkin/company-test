import type { OrgNode } from '@/models/org-node.model.js';

export interface OrgNodeRepository {
  findAll(): Promise<OrgNode[]>;
}

export interface InMemoryOrgNodeRepositoryDeps {
  orgNodesSeed: readonly OrgNode[];
}

const cloneNode = (node: OrgNode): OrgNode => ({ ...node, updatedAt: new Date(node.updatedAt) });

/** Stores nodes in process memory. Every read returns defensive copies. */
export class InMemoryOrgNodeRepository implements OrgNodeRepository {
  private readonly nodes: OrgNode[];

  constructor({ orgNodesSeed }: InMemoryOrgNodeRepositoryDeps) {
    this.nodes = orgNodesSeed.map(cloneNode);
  }

  async findAll(): Promise<OrgNode[]> {
    return this.nodes.map(cloneNode);
  }
}
