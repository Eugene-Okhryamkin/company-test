/** Public API contract of a GET /api/org-tree item. */
export interface OrgNodeDto {
  id: string;
  name: string;
  parentId: string | null;
  headcount: number;
  budget: number;
  performance: number;
  /** ISO 8601, UTC. */
  updatedAt: string;
}
