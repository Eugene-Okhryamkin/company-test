import { describe, expect, it } from 'vitest';
import { OrgTreeIntegrityError, validateOrgNodes } from '@/services/org-tree.validator.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

const expectInvalid = (nodes: Parameters<typeof validateOrgNodes>[0], message: RegExp) => {
  expect(() => validateOrgNodes(nodes)).toThrow(OrgTreeIntegrityError);
  expect(() => validateOrgNodes(nodes)).toThrow(message);
};

describe('validateOrgNodes', () => {
  it('accepts an empty list', () => {
    expect(() => validateOrgNodes([])).not.toThrow();
  });

  it('accepts a valid multi-level tree', () => {
    const nodes = [
      makeNode({ id: 'd1' }),
      makeNode({ id: 'd1-1', parentId: 'd1' }),
      makeNode({ id: 'd1-1-1', parentId: 'd1-1' }),
    ];
    expect(() => validateOrgNodes(nodes)).not.toThrow();
  });

  it('accepts boundary values for numeric fields', () => {
    const nodes = [
      makeNode({ id: 'a', headcount: 0, budget: 0, performance: 0 }),
      makeNode({ id: 'b', performance: 100 }),
    ];
    expect(() => validateOrgNodes(nodes)).not.toThrow();
  });

  it('rejects an empty id', () => {
    expectInvalid([makeNode({ id: '' })], /id/);
  });

  it('rejects duplicate ids', () => {
    expectInvalid([makeNode({ id: 'x' }), makeNode({ id: 'x' })], /duplicate id "x"/);
  });

  it('rejects a blank name', () => {
    expectInvalid([makeNode({ name: '   ' })], /name/);
  });

  it('rejects a reference to a missing parent', () => {
    expectInvalid([makeNode({ id: 'a', parentId: 'ghost' })], /unknown parent "ghost"/);
  });

  it('rejects a node that is its own parent', () => {
    expectInvalid([makeNode({ id: 'a', parentId: 'a' })], /cycle/);
  });

  it('rejects a cycle between several nodes', () => {
    const nodes = [
      makeNode({ id: 'a', parentId: 'c' }),
      makeNode({ id: 'b', parentId: 'a' }),
      makeNode({ id: 'c', parentId: 'b' }),
    ];
    expectInvalid(nodes, /cycle/);
  });

  it.each([-1, 1.5, Number.NaN])('rejects headcount %s', (headcount) => {
    expectInvalid([makeNode({ headcount })], /headcount/);
  });

  it.each([-1, Number.POSITIVE_INFINITY, Number.NaN])('rejects budget %s', (budget) => {
    expectInvalid([makeNode({ budget })], /budget/);
  });

  it.each([-0.1, 100.1, Number.NaN])('rejects performance %s', (performance) => {
    expectInvalid([makeNode({ performance })], /performance/);
  });

  it('rejects an invalid updatedAt date', () => {
    expectInvalid([makeNode({ updatedAt: new Date('not a date') })], /updatedAt/);
  });
});
