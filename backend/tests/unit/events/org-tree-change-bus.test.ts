import { describe, expect, it, vi } from 'vitest';
import { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

const patch = { version: 1, nodes: [makeNode()] };

describe('OrgTreeChangeBus', () => {
  it('delivers published patches to every subscriber', () => {
    const bus = new OrgTreeChangeBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);

    bus.publish(patch);

    expect(a).toHaveBeenCalledWith(patch);
    expect(b).toHaveBeenCalledWith(patch);
    expect(bus.subscriberCount).toBe(2);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new OrgTreeChangeBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);

    unsubscribe();
    bus.publish(patch);

    expect(listener).not.toHaveBeenCalled();
    expect(bus.subscriberCount).toBe(0);
  });

  it('keeps delivering to others when one subscriber throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bus = new OrgTreeChangeBus();
    const healthy = vi.fn();
    bus.subscribe(() => {
      throw new Error('boom');
    });
    bus.subscribe(healthy);

    expect(() => bus.publish(patch)).not.toThrow();
    expect(healthy).toHaveBeenCalledWith(patch);
    expect(console.error).toHaveBeenCalled();
  });
});
