import type { OrgNode } from '@/models/org-node.model.js';

/** Metrics that may change in real time. Structure (name, parentId) is not live-updated. */
export type OrgNodeMetrics = Pick<OrgNode, 'headcount' | 'budget' | 'performance'>;

/** A requested change of one node. */
export interface OrgNodeChange {
  id: string;
  fields: Partial<OrgNodeMetrics>;
}

/** Result of one applied batch: new data version and the full updated nodes. */
export interface OrgTreePatch {
  version: number;
  nodes: OrgNode[];
}
