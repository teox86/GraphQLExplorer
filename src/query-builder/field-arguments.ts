import type { ArgumentValue, GovernanceConfig, IntrospectionSchemaModel, SchemaField } from '../types';
import { flattenArguments } from '../schema/flatten-arguments';
import { getFieldArgumentDefault } from '../governance/resolve';

export interface EffectiveFieldArgument {
  /** Dotted path within the field's arguments, e.g. "lang" or "filter.since". */
  path: string;
  /** The value the user entered, or the governance default when none was entered. */
  value: unknown;
  isRequired: boolean;
  hasValue: boolean;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Computes the effective value for every (flattened) argument a field
 * declares, layering the user's per-field entries over governance-declared
 * defaults. This single source of truth is used by the field-argument editor,
 * the query generator, and the complexity checker so they never disagree.
 */
export function resolveEffectiveFieldArguments(
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
  field: SchemaField,
  fieldPath: string[],
  selectionArgs: ArgumentValue[] | undefined,
): EffectiveFieldArgument[] {
  if (field.args.length === 0) return [];
  const fieldPathStr = fieldPath.join('.');
  const enteredByPath = new Map((selectionArgs ?? []).map((a) => [a.path, a.value]));

  return flattenArguments(model, field.args).map(({ path, arg }) => {
    const entered = enteredByPath.get(path);
    const value = !isEmpty(entered) ? entered : getFieldArgumentDefault(governance, fieldPathStr, path);
    return { path, value, isRequired: arg.isRequired, hasValue: !isEmpty(value) };
  });
}

/** Names of required arguments on a field that still have no effective value. */
export function missingRequiredFieldArguments(
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
  field: SchemaField,
  fieldPath: string[],
  selectionArgs: ArgumentValue[] | undefined,
): string[] {
  return resolveEffectiveFieldArguments(model, governance, field, fieldPath, selectionArgs)
    .filter((a) => a.isRequired && !a.hasValue)
    .map((a) => a.path);
}
