/** One changed node inside a patch: id + all live metrics + new updatedAt. */
export interface OrgNodePatchDto {
  id: string;
  headcount: number;
  budget: number;
  performance: number;
  /** ISO 8601, UTC. */
  updatedAt: string;
}

/** Server → client messages on the /api/live WebSocket. */
export type LiveMessageDto =
  | { type: 'hello'; version: number; heartbeatIntervalMs: number }
  | { type: 'patch'; version: number; nodes: OrgNodePatchDto[] }
  | { type: 'heartbeat'; version: number };
