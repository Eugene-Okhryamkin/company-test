import { ORG_LEVELS, SEARCH_SORT_KEYS, SORT_DIRECTIONS } from '@/models/search-filter.model.js';

const nullableNumber = (description: string) => ({ type: ['number', 'null'], description }) as const;

const range = (description: string) =>
  ({
    type: 'object',
    description,
    properties: {
      min: nullableNumber('Inclusive lower bound, null if not mentioned'),
      max: nullableNumber('Inclusive upper bound, null if not mentioned'),
    },
    required: ['min', 'max'],
    additionalProperties: false,
  }) as const;

/**
 * JSON Schema of SearchFilter for OpenAI Structured Outputs (strict mode):
 * every property is required, optional values are expressed as null, no extra keys.
 */
export const SEARCH_FILTER_JSON_SCHEMA = {
  type: 'object',
  properties: {
    nameContains: {
      type: ['string', 'null'],
      description: 'Substring of the unit name if the user names a unit or a word from its name, otherwise null',
    },
    levels: {
      type: 'array',
      description: 'Hierarchy levels to keep: 1 division, 2 department, 3 team. Empty array means any level',
      items: { type: 'integer', enum: [...ORG_LEVELS] },
    },
    totalHeadcount: range('Total employees of the unit including all nested units'),
    totalBudget: range('Total budget in roubles including all nested units'),
    avgPerformance: range('Average performance on a 0-100 scale'),
    sort: {
      anyOf: [
        {
          type: 'object',
          properties: {
            key: { type: 'string', enum: [...SEARCH_SORT_KEYS] },
            direction: { type: 'string', enum: [...SORT_DIRECTIONS] },
          },
          required: ['key', 'direction'],
          additionalProperties: false,
        },
        { type: 'null' },
      ],
    },
    limit: {
      type: ['integer', 'null'],
      description: 'Maximum number of rows, e.g. 5 for "top 5"; null if not requested',
    },
  },
  required: ['nameContains', 'levels', 'totalHeadcount', 'totalBudget', 'avgPerformance', 'sort', 'limit'],
  additionalProperties: false,
} as const;
