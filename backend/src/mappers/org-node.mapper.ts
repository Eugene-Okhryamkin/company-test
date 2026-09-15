import type { LiveMessageDto, OrgNodePatchDto } from '@/dto/live-message.dto.js';
import type { OrgNodeDto } from '@/dto/org-node.dto.js';
import type { OrgNode } from '@/models/org-node.model.js';
import type { OrgTreePatch } from '@/models/org-tree-patch.model.js';

/** Converts domain models into API DTOs: whitelists contract fields, serialises dates. */
export class OrgNodeMapper {
  toDto(node: OrgNode): OrgNodeDto {
    return {
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      headcount: node.headcount,
      budget: node.budget,
      performance: node.performance,
      updatedAt: node.updatedAt.toISOString(),
    };
  }

  toDtoList(nodes: readonly OrgNode[]): OrgNodeDto[] {
    return nodes.map((node) => this.toDto(node));
  }

  toPatchDto(node: OrgNode): OrgNodePatchDto {
    return {
      id: node.id,
      headcount: node.headcount,
      budget: node.budget,
      performance: node.performance,
      updatedAt: node.updatedAt.toISOString(),
    };
  }

  toPatchMessage(patch: OrgTreePatch): Extract<LiveMessageDto, { type: 'patch' }> {
    return { type: 'patch', version: patch.version, nodes: patch.nodes.map((node) => this.toPatchDto(node)) };
  }
}
