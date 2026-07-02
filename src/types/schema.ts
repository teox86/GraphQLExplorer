/**
 * Internal, simplified representation of a GraphQL schema.
 *
 * This is intentionally decoupled from the raw `graphql-js` / introspection
 * shapes so the rest of the app (governance, query builder, UI) never has to
 * deal with introspection JSON directly. Both the introspection parser and
 * the SDL parser produce this same model.
 */

export type SchemaKind =
  | 'OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT'
  | 'SCALAR'
  | 'LIST'
  | 'NON_NULL';

/** A GraphQL type reference, e.g. `[String!]!`, unwound into a walkable chain. */
export interface SchemaTypeRef {
  kind: SchemaKind;
  /** Name of the named type at the bottom of this reference (e.g. "String", "Report"). Null for LIST/NON_NULL wrappers. */
  name: string | null;
  ofType: SchemaTypeRef | null;
}

export interface SchemaArgument {
  name: string;
  description: string | null;
  type: SchemaTypeRef;
  defaultValue: string | null;
  isRequired: boolean;
  deprecationReason: string | null;
}

export interface SchemaField {
  name: string;
  description: string | null;
  type: SchemaTypeRef;
  args: SchemaArgument[];
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface SchemaEnumValue {
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface SchemaType {
  kind: SchemaKind;
  name: string;
  description: string | null;
  fields: SchemaField[];
  /** For ENUM types. */
  enumValues: SchemaEnumValue[];
  /** For INPUT_OBJECT types, the same shape as fields but rendered as arguments. */
  inputFields: SchemaArgument[];
  /** For UNION / INTERFACE types. */
  possibleTypes: string[];
  interfaces: string[];
}

export interface IntrospectionSchemaModel {
  queryTypeName: string;
  mutationTypeName: string | null;
  subscriptionTypeName: string | null;
  types: Record<string, SchemaType>;
  /** Convenience accessor: the fields exposed on the root Query type. */
  queryFields: SchemaField[];
  /** Where this model came from - useful for diagnostics in the UI. */
  source: 'introspection' | 'sdl' | 'mock';
  fetchedAt: string;
}

/** Utility helpers for walking SchemaTypeRef chains. */
export function unwrapType(ref: SchemaTypeRef): { namedType: string | null; isList: boolean; isNonNull: boolean; listIsNonNull: boolean } {
  let current = ref;
  let isNonNull = false;
  let isList = false;
  let listIsNonNull = false;

  if (current.kind === 'NON_NULL') {
    isNonNull = true;
    current = current.ofType as SchemaTypeRef;
  }
  if (current.kind === 'LIST') {
    isList = true;
    let inner = current.ofType as SchemaTypeRef;
    if (inner.kind === 'NON_NULL') {
      listIsNonNull = true;
      inner = inner.ofType as SchemaTypeRef;
    }
    current = inner;
  }
  return { namedType: current.name, isList, isNonNull, listIsNonNull };
}

export function typeRefToString(ref: SchemaTypeRef): string {
  switch (ref.kind) {
    case 'NON_NULL':
      return `${typeRefToString(ref.ofType as SchemaTypeRef)}!`;
    case 'LIST':
      return `[${typeRefToString(ref.ofType as SchemaTypeRef)}]`;
    default:
      return ref.name ?? 'Unknown';
  }
}
