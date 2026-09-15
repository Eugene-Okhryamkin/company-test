import type { RequestHandler } from 'express';
import type { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import type { OrgTreeReader } from '@/services/org-tree.service.js';

export interface OrgTreeControllerDeps {
  orgTreeService: OrgTreeReader;
  orgNodeMapper: OrgNodeMapper;
}

export class OrgTreeController {
  private readonly orgTreeService: OrgTreeReader;
  private readonly orgNodeMapper: OrgNodeMapper;

  constructor({ orgTreeService, orgNodeMapper }: OrgTreeControllerDeps) {
    this.orgTreeService = orgTreeService;
    this.orgNodeMapper = orgNodeMapper;
  }

  /** GET /api/org-tree. Arrow property keeps `this` bound when passed to the router. */
  getOrgTree: RequestHandler = async (_req, res) => {
    const nodes = await this.orgTreeService.getFlatTree();
    // Always revalidate; Express adds an ETag, so unchanged data costs a 304 without a body.
    res.set('Cache-Control', 'no-cache');
    res.json(this.orgNodeMapper.toDtoList(nodes));
  };
}
