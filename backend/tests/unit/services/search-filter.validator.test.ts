import { describe, expect, it } from 'vitest';
import type { SearchFilter } from '@/models/search-filter.model.js';
import { EMPTY_SEARCH_FILTER, InvalidSearchFilterError, parseSearchFilter } from '@/services/search-filter.validator.js';

const filter = (overrides: Record<string, unknown> = {}) => ({ ...EMPTY_SEARCH_FILTER, ...overrides });

describe('parseSearchFilter', () => {
  it('accepts a complete filter as is', () => {
    const value: SearchFilter = {
      nameContains: 'API',
      levels: [2, 3],
      totalHeadcount: { min: 10, max: null },
      totalBudget: { min: null, max: 5_000_000 },
      avgPerformance: { min: 60, max: 80 },
      sort: { key: 'totalBudget', direction: 'desc' },
      limit: 5,
    };

    expect(parseSearchFilter(value)).toEqual(value);
  });

  it('has an empty filter that matches everything', () => {
    expect(EMPTY_SEARCH_FILTER).toEqual({
      nameContains: null,
      levels: [],
      totalHeadcount: { min: null, max: null },
      totalBudget: { min: null, max: null },
      avgPerformance: { min: null, max: null },
      sort: null,
      limit: null,
    });
  });

  it('trims the name and turns a blank name into null', () => {
    expect(parseSearchFilter(filter({ nameContains: '  Core  ' })).nameContains).toBe('Core');
    expect(parseSearchFilter(filter({ nameContains: '   ' })).nameContains).toBeNull();
  });

  it('deduplicates and orders levels', () => {
    expect(parseSearchFilter(filter({ levels: [3, 1, 3] })).levels).toEqual([1, 3]);
  });

  it('swaps an inverted range', () => {
    expect(parseSearchFilter(filter({ totalBudget: { min: 10, max: 1 } })).totalBudget).toEqual({ min: 1, max: 10 });
  });

  it('clamps performance to the 0–100 scale', () => {
    expect(parseSearchFilter(filter({ avgPerformance: { min: -5, max: 120 } })).avgPerformance).toEqual({
      min: 0,
      max: 100,
    });
  });

  it('does not share nested objects with the input', () => {
    const input = filter({ totalHeadcount: { min: 1, max: 2 }, levels: [1] });
    const result = parseSearchFilter(input);

    expect(result.totalHeadcount).not.toBe(input.totalHeadcount);
    expect(result.levels).not.toBe(input.levels);
  });

  it.each([
    ['not an object', 'filter'],
    ['null', null],
    ['an array', []],
    ['a missing field', { ...EMPTY_SEARCH_FILTER, limit: undefined }],
    ['a non-string name', filter({ nameContains: 42 })],
    ['an unknown level', filter({ levels: [4] })],
    ['a fractional level', filter({ levels: [1.5] })],
    ['levels that are not an array', filter({ levels: 1 })],
    ['a non-numeric range bound', filter({ totalHeadcount: { min: '5', max: null } })],
    ['an infinite range bound', filter({ totalBudget: { min: Number.POSITIVE_INFINITY, max: null } })],
    ['a negative headcount', filter({ totalHeadcount: { min: -1, max: null } })],
    ['a negative budget', filter({ totalBudget: { min: null, max: -1 } })],
    ['a range that is not an object', filter({ totalBudget: 5 })],
    ['an unknown sort key', filter({ sort: { key: 'salary', direction: 'asc' } })],
    ['an unknown sort direction', filter({ sort: { key: 'name', direction: 'up' } })],
    ['a zero limit', filter({ limit: 0 })],
    ['a fractional limit', filter({ limit: 2.5 })],
  ])('rejects %s', (_label, value) => {
    expect(() => parseSearchFilter(value)).toThrow(InvalidSearchFilterError);
  });
});
