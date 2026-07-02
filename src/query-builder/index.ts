import type { GeneratedQuery, GovernanceConfig, IntrospectionSchemaModel, QueryConfiguration } from '../types';
import { typeRefToString } from '../types';
import { getRootQueryOverride } from '../governance/resolve';
import { findRootQueryField } from '../schema/schema-utils';
import { buildVariables } from './build-variables';
import { renderSelectionSet } from './build-selection';
import { buildDocument } from './build-document';
import { VariableRegistry } from './variable-registry';

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
  const registry = new VariableRegistry();

  // Root-query arguments keep their exact names (the field references them by name).
  const rootVariables = buildVariables(config, governance.dimensions, rootOverride);
  const argsByName = new Map(rootField.args.map((a) => [a.name, a]));
  const rootArgumentNames: string[] = [];
  for (const [name, value] of Object.entries(rootVariables)) {
    const arg = argsByName.get(name);
    if (!arg) continue;
    registry.addExact(name, typeRefToString(arg.type), value);
    rootArgumentNames.push(name);
  }

  // Nested field arguments are collected into the registry while rendering.
  const selectionText = renderSelectionSet(model, rootField.type, config.selection, { governance, registry });

  const documentResult = buildDocument({
    operationName: config.operationName || 'BuilderQuery',
    rootField,
    rootArgumentNames,
    variableDefinitions: registry.definitions,
    selectionText,
  });

  if (!documentResult.success) {
    return { success: false, errorMessage: documentResult.errorMessage };
  }

  return {
    success: true,
    query: {
      documentText: documentResult.documentText!,
      variables: registry.values,
      operationName: config.operationName || 'BuilderQuery',
    },
  };
}

export { buildVariables } from './build-variables';
export { renderSelectionSet } from './build-selection';
export { VariableRegistry } from './variable-registry';
export { resolveEffectiveFieldArguments, missingRequiredFieldArguments } from './field-arguments';
export { resolveTimeRange, resolvePresetRange, TIME_RANGE_PRESET_LABELS } from './time-range-resolver';
export { setPath } from './path-utils';
