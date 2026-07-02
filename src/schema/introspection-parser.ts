import type {
  IntrospectionSchemaModel,
  SchemaArgument,
  SchemaEnumValue,
  SchemaField,
  SchemaKind,
  SchemaType,
  SchemaTypeRef,
} from '../types';
import type {
  RawEnumValue,
  RawField,
  RawFullType,
  RawInputValue,
  RawIntrospectionResponse,
  RawTypeRef,
} from './raw-introspection-types';

const INTROSPECTION_TYPE_PREFIX = '__';

function parseTypeRef(raw: RawTypeRef | null): SchemaTypeRef {
  if (!raw) {
    // Defensive fallback: introspection responses are always well-formed for
    // valid schemas, but a malformed/proxy-mangled response shouldn't crash parsing.
    return { kind: 'SCALAR', name: 'Unknown', ofType: null };
  }
  return {
    kind: raw.kind as SchemaKind,
    name: raw.name,
    ofType: raw.ofType ? parseTypeRef(raw.ofType) : null,
  };
}

function isArgRequired(type: SchemaTypeRef, defaultValue: string | null): boolean {
  return type.kind === 'NON_NULL' && defaultValue === null;
}

function parseArgument(raw: RawInputValue): SchemaArgument {
  const type = parseTypeRef(raw.type);
  return {
    name: raw.name,
    description: raw.description,
    type,
    defaultValue: raw.defaultValue,
    isRequired: isArgRequired(type, raw.defaultValue),
    deprecationReason: null,
  };
}

function parseField(raw: RawField): SchemaField {
  return {
    name: raw.name,
    description: raw.description,
    type: parseTypeRef(raw.type),
    args: (raw.args ?? []).map(parseArgument),
    isDeprecated: raw.isDeprecated,
    deprecationReason: raw.deprecationReason,
  };
}

function parseEnumValue(raw: RawEnumValue): SchemaEnumValue {
  return {
    name: raw.name,
    description: raw.description,
    isDeprecated: raw.isDeprecated,
    deprecationReason: raw.deprecationReason,
  };
}

function parseFullType(raw: RawFullType): SchemaType {
  return {
    kind: raw.kind as SchemaKind,
    name: raw.name ?? 'Unknown',
    description: raw.description,
    fields: (raw.fields ?? []).map(parseField),
    enumValues: (raw.enumValues ?? []).map(parseEnumValue),
    inputFields: (raw.inputFields ?? []).map(parseArgument),
    possibleTypes: (raw.possibleTypes ?? []).map((t) => t.name),
    interfaces: (raw.interfaces ?? []).map((t) => t.name),
  };
}

export function parseIntrospectionResponse(raw: RawIntrospectionResponse): IntrospectionSchemaModel {
  const schema = raw.__schema;
  const types: Record<string, SchemaType> = {};

  for (const rawType of schema.types) {
    if (!rawType.name || rawType.name.startsWith(INTROSPECTION_TYPE_PREFIX)) continue;
    types[rawType.name] = parseFullType(rawType);
  }

  const queryTypeName = schema.queryType.name;
  const queryType = types[queryTypeName];

  return {
    queryTypeName,
    mutationTypeName: schema.mutationType?.name ?? null,
    subscriptionTypeName: schema.subscriptionType?.name ?? null,
    types,
    queryFields: queryType ? queryType.fields : [],
    source: 'introspection',
    fetchedAt: new Date().toISOString(),
  };
}
