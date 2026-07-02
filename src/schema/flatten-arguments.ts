import type { IntrospectionSchemaModel, SchemaArgument } from '../types';
import { resolveNamedType } from './schema-utils';

export interface FlatArgument {
  /** Dotted path from the root argument, e.g. "input.period.from". */
  path: string;
  /** The leaf argument definition (name, type, description, default, required). */
  arg: SchemaArgument;
}

/**
 * Flattens root-query arguments into leaf (scalar/enum/list) entries,
 * recursing into INPUT_OBJECT argument types. This lets the UI render one
 * control per leaf value while still producing correctly nested GraphQL
 * variables (see query-builder/path-utils.ts).
 */
export function flattenArguments(model: IntrospectionSchemaModel, args: SchemaArgument[], maxDepth = 5): FlatArgument[] {
  function walk(current: SchemaArgument[], prefix: string, depth: number): FlatArgument[] {
    if (depth > maxDepth) return [];
    const result: FlatArgument[] = [];
    for (const arg of current) {
      const path = prefix ? `${prefix}.${arg.name}` : arg.name;
      const named = resolveNamedType(model, arg.type);
      if (named && named.kind === 'INPUT_OBJECT' && named.inputFields.length > 0) {
        result.push(...walk(named.inputFields, path, depth + 1));
      } else {
        result.push({ path, arg });
      }
    }
    return result;
  }
  return walk(args, '', 0);
}
