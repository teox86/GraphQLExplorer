import type { ArgumentValueKind, IntrospectionSchemaModel, SchemaTypeRef } from '../types';
import { unwrapType } from '../types';

const DATE_TIME_HINT = /date|time/i;

export interface InferredControl {
  kind: ArgumentValueKind;
  isList: boolean;
  /** Populated when the (possibly list-wrapped) named type is an ENUM. */
  enumValues: string[] | null;
}

export function inferArgumentControl(model: IntrospectionSchemaModel, ref: SchemaTypeRef): InferredControl {
  const { namedType, isList } = unwrapType(ref);

  if (!namedType) return { kind: 'unknown', isList, enumValues: null };

  const namedSchemaType = model.types[namedType];
  if (namedSchemaType?.kind === 'ENUM') {
    return { kind: isList ? 'multi-select' : 'enum', isList, enumValues: namedSchemaType.enumValues.map((v) => v.name) };
  }

  if (namedType === 'Boolean') return { kind: 'boolean', isList, enumValues: null };
  if (namedType === 'Int' || namedType === 'Float') return { kind: isList ? 'json' : 'number', isList, enumValues: null };

  if (namedType === 'String' || namedType === 'ID') {
    if (DATE_TIME_HINT.test(namedType)) return { kind: 'datetime', isList, enumValues: null };
    return { kind: isList ? 'multi-select' : 'string', isList, enumValues: null };
  }

  if (namedSchemaType?.kind === 'SCALAR') {
    if (DATE_TIME_HINT.test(namedType)) return { kind: 'datetime', isList, enumValues: null };
    return { kind: isList ? 'multi-select' : 'string', isList, enumValues: null };
  }

  // INPUT_OBJECT reaching here means it had no fields to flatten, or is otherwise unresolvable - fall back to JSON.
  return { kind: 'json', isList, enumValues: null };
}
