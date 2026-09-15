import type { OrgNodeDto } from '@/dto/org-node.dto.js';
import type { OrgNode } from '@/models/org-node.model.js';

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
}
