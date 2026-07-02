import type { GeneratedQuery, GovernanceConfig, IntrospectionSchemaModel, QueryConfiguration } from '../types';
import { getRootQueryOverride } from '../governance/resolve';
import { findRootQueryField } from '../schema/schema-utils';
import { buildVariables } from './build-variables';
import { renderSelectionSet } from './build-selection';
import { buildDocument } from './build-document';

export interface GenerateQueryResult {
  success: boolean;
  query?: GeneratedQuery;
  errorMessage?: string;
}

export function generateQuery(
  config: QueryConfiguration,
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
): GenerateQueryResult {
  if (!config.rootFieldName) {
    return { success: false, errorMessage: 'No root query selected yet.' };
  }
  const rootField = findRootQueryField(model, config.rootFieldName);
  if (!rootField) {
    return { success: false, errorMessage: `Root query "${config.rootFieldName}" was not found in the current schema.` };
  }

  const rootOverride = getRootQueryOverride(governance, config.rootFieldName);
  const variables = buildVariables(config, governance.dimensions, rootOverride);
  const selectionText = renderSelectionSet(model, rootField.type, config.selection);

  const documentResult = buildDocument({
    operationName: config.operationName || 'BuilderQuery',
    rootField,
    variables,
    selectionText,
  });

  if (!documentResult.success) {
    return { success: false, errorMessage: documentResult.errorMessage };
  }

  return {
    success: true,
    query: {
      documentText: documentResult.documentText!,
      variables,
      operationName: config.operationName || 'BuilderQuery',
    },
  };
}

export { buildVariables } from './build-variables';
export { renderSelectionSet } from './build-selection';
export { resolveTimeRange, resolvePresetRange, TIME_RANGE_PRESET_LABELS } from './time-range-resolver';
export { setPath } from './path-utils';
