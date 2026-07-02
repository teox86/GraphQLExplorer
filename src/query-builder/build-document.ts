import { parse, print } from 'graphql';
import type { SchemaField } from '../types';
import { typeRefToString } from '../types';
import type { VariableDefinition } from './variable-registry';

export interface BuildDocumentInput {
  operationName: string;
  rootField: SchemaField;
  /** Names of root-query arguments that have a value (referenced as `argName: $argName`). */
  rootArgumentNames: string[];
  /** All operation variables to declare: root arguments plus nested field arguments. */
  variableDefinitions: VariableDefinition[];
  selectionText: string;
}

export interface BuildDocumentResult {
  success: boolean;
  documentText?: string;
  errorMessage?: string;
}

/**
 * Assembles the raw operation text and re-parses/prints it through
 * graphql-js purely for canonical pretty-printing and as a cheap validity
 * check (a malformed selection set will throw here instead of silently
 * reaching the network).
 */
export function buildDocument({
  operationName,
  rootField,
  rootArgumentNames,
  variableDefinitions,
  selectionText,
}: BuildDocumentInput): BuildDocumentResult {
  const argsByName = new Map(rootField.args.map((a) => [a.name, a]));

  const variableDefClause = variableDefinitions.map((v) => `$${v.name}: ${v.graphQLType}`).join(', ');

  const fieldArguments = rootArgumentNames
    .filter((name) => argsByName.has(name))
    .map((name) => `${name}: $${name}`)
    .join(', ');

  const body = selectionText.trim().length > 0 ? selectionText : '__typename';

  const argsClause = fieldArguments ? `(${fieldArguments})` : '';
  const varsClause = variableDefClause ? `(${variableDefClause})` : '';

  const rawText = `query ${operationName}${varsClause} { ${rootField.name}${argsClause} { ${body} } }`;

  try {
    const documentText = print(parse(rawText));
    return { success: true, documentText };
  } catch (error) {
    return { success: false, errorMessage: error instanceof Error ? error.message : 'Failed to build query document.' };
  }
}

/** Retained for callers that only need a single argument's printed type. */
export { typeRefToString };
