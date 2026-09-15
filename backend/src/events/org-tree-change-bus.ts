import type { OrgTreePatch } from '@/models/org-tree-patch.model.js';

export type OrgTreePatchListener = (patch: OrgTreePatch) => void;

/** In-process pub/sub between the service (publisher) and transports such as the WebSocket gateway. */
export class OrgTreeChangeBus {
  private readonly listeners = new Set<OrgTreePatchListener>();

  subscribe(listener: OrgTreePatchListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(patch: OrgTreePatch): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(patch);
      } catch (error) {
        // One broken subscriber must not stop the others.
        console.error('[backend] change listener failed:', error);
      }
    }
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }
}
