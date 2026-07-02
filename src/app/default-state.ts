import type { QueryConfiguration } from '../types';

export function createEmptyQueryConfiguration(): QueryConfiguration {
  return {
    intentCategoryId: null,
    rootFieldName: null,
    operationName: 'BuilderQuery',
    arguments: [],
    timeRange: null,
    dimensionFilters: [],
    groupByDimensionKeys: [],
    timeBucket: null,
    selection: [],
    overrideWarnings: false,
  };
}
