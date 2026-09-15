import type { OrgNode } from '@/models/org-node.model.js';
import type { OrgNodeRepository } from '@/repositories/org-node.repository.js';
import { validateOrgNodes } from '@/services/org-tree.validator.js';

export interface OrgTreeReader {
  getFlatTree(): Promise<OrgNode[]>;
}

export interface OrgTreeServiceDeps {
  orgNodeRepository: OrgNodeRepository;
}

export class OrgTreeService implements OrgTreeReader {
  private readonly orgNodeRepository: OrgNodeRepository;

  constructor({ orgNodeRepository }: OrgTreeServiceDeps) {
    this.orgNodeRepository = orgNodeRepository;
  }

  /** Returns the org structure as a flat list; guarantees tree integrity. */
  async getFlatTree(): Promise<OrgNode[]> {
    const nodes = await this.orgNodeRepository.findAll();
    validateOrgNodes(nodes);
    return nodes;
  }
}
