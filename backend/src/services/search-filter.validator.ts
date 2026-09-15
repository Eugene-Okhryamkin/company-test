import {
  ORG_LEVELS,
  SEARCH_SORT_KEYS,
  SORT_DIRECTIONS,
  type NumericRange,
  type OrgLevel,
  type SearchFilter,
} from '@/models/search-filter.model.js';

export class InvalidSearchFilterError extends Error {
  constructor(message: string) {
    super(`Invalid search filter: ${message}`);
    this.name = 'InvalidSearchFilterError';
  }
}

export const EMPTY_SEARCH_FILTER: Readonly<SearchFilter> = Object.freeze({
  nameContains: null,
  levels: [],
  totalHeadcount: { min: null, max: null },
  totalBudget: { min: null, max: null },
  avgPerformance: { min: null, max: null },
  sort: null,
  limit: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function field(source: Record<string, unknown>, key: string): unknown {
  if (!(key in source)) throw new InvalidSearchFilterError(`"${key}" is required`);
  return source[key];
}

function parseRange(value: unknown, key: string, bounds: { min: number; max: number }): NumericRange {
  if (!isRecord(value)) throw new InvalidSearchFilterError(`"${key}" must be an object`);

  const bound = (name: 'min' | 'max'): number | null => {
    const raw = field(value, name);
    if (raw === null) return null;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new InvalidSearchFilterError(`"${key}.${name}" must be a finite number or null`);
    }
    if (raw < 0 && bounds.min === 0 && bounds.max === Number.POSITIVE_INFINITY) {
      throw new InvalidSearchFilterError(`"${key}.${name}" must not be negative`);
    }
    return Math.min(Math.max(raw, bounds.min), bounds.max);
  };

  const min = bound('min');
  const max = bound('max');
  // An LLM may swap "from" and "to"; the intent is still unambiguous.
  return min !== null && max !== null && min > max ? { min: max, max: min } : { min, max };
}

function parseLevels(value: unknown): OrgLevel[] {
  if (!Array.isArray(value)) throw new InvalidSearchFilterError('"levels" must be an array');
  for (const level of value) {
    if (!ORG_LEVELS.includes(level as OrgLevel)) throw new InvalidSearchFilterError(`unknown level ${String(level)}`);
  }
  return [...new Set(value as OrgLevel[])].sort((a, b) => a - b);
}

function parseSort(value: unknown): SearchFilter['sort'] {
  if (value === null) return null;
  if (!isRecord(value)) throw new InvalidSearchFilterError('"sort" must be an object or null');
  const key = field(value, 'key');
  const direction = field(value, 'direction');
  if (!SEARCH_SORT_KEYS.includes(key as never)) throw new InvalidSearchFilterError(`unknown sort key ${String(key)}`);
  if (!SORT_DIRECTIONS.includes(direction as never)) {
    throw new InvalidSearchFilterError(`unknown sort direction ${String(direction)}`);
  }
  return { key, direction } as NonNullable<SearchFilter['sort']>;
}

function parseName(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new InvalidSearchFilterError('"nameContains" must be a string or null');
  return value.trim() || null;
}

function parseLimit(value: unknown): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new InvalidSearchFilterError('"limit" must be a positive integer or null');
  }
  return value as number;
}

const NON_NEGATIVE = { min: 0, max: Number.POSITIVE_INFINITY };
const PERCENT = { min: 0, max: 100 };

/**
 * Defensive validation of an LLM answer. Structured outputs guarantee the shape, but the
 * contract with the client must hold even for a misbehaving or compatible-but-different model.
 * Rejects type errors, normalises harmless semantic slips (blank name, inverted range, 120 %).
 */
export function parseSearchFilter(value: unknown): SearchFilter {
  if (!isRecord(value)) throw new InvalidSearchFilterError('must be an object');

  return {
    nameContains: parseName(field(value, 'nameContains')),
    levels: parseLevels(field(value, 'levels')),
    totalHeadcount: parseRange(field(value, 'totalHeadcount'), 'totalHeadcount', NON_NEGATIVE),
    totalBudget: parseRange(field(value, 'totalBudget'), 'totalBudget', NON_NEGATIVE),
    avgPerformance: parseRange(field(value, 'avgPerformance'), 'avgPerformance', PERCENT),
    sort: parseSort(field(value, 'sort')),
    limit: parseLimit(field(value, 'limit')),
  };
}
