import type { IntrospectionSchemaModel, SchemaType, SchemaTypeRef } from '../types';
import { unwrapType } from '../types';

export const BUILTIN_SCALAR_NAMES = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);

export function resolveNamedType(model: IntrospectionSchemaModel, ref: SchemaTypeRef): SchemaType | null {
  const { namedType } = unwrapType(ref);
  if (!namedType) return null;
  return model.types[namedType] ?? null;
}

export function isScalarLikeType(type: SchemaType | null): boolean {
  if (!type) return true; // unknown/builtin scalar treated as leaf
  return type.kind === 'SCALAR' || type.kind === 'ENUM';
}

export function isObjectLikeType(type: SchemaType | null): boolean {
  if (!type) return false;
  return type.kind === 'OBJECT' || type.kind === 'INTERFACE' || type.kind === 'UNION';
}

export function isListType(ref: SchemaTypeRef): boolean {
  return unwrapType(ref).isList;
}

/**
 * Fields available for selection on the type a given field ref resolves to.
 * For unions we fall back to an empty list (v1 does not support inline fragments yet).
 */
export function getSelectableFields(model: IntrospectionSchemaModel, ref: SchemaTypeRef) {
  const named = resolveNamedType(model, ref);
  if (!named || !isObjectLikeType(named)) return [];
  return named.fields;
}

export function findRootQueryField(model: IntrospectionSchemaModel, fieldName: string) {
  return model.queryFields.find((f) => f.name === fieldName) ?? null;
}

/** True when a field's type resolves to a leaf (scalar/enum) with no sub-selectable fields. */
export function isLeafField(model: IntrospectionSchemaModel, ref: SchemaTypeRef): boolean {
  const named = resolveNamedType(model, ref);
  return isScalarLikeType(named);
}
