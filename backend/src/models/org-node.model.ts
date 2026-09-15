/** Domain model of an organisational unit (division, department or team). */
export interface OrgNode {
  id: string;
  name: string;
  /** null for root nodes (divisions). */
  parentId: string | null;
  /** Employees attached directly to this node (descendants not included). */
  headcount: number;
  /** Own budget in roubles (descendants not included). */
  budget: number;
  /** Efficiency metric, 0–100. */
  performance: number;
  updatedAt: Date;
}
