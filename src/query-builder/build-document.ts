import { parse, print } from 'graphql';
import type { SchemaField } from '../types';
import { typeRefToString } from '../types';

export interface BuildDocumentInput {
  operationName: string;
  rootField: SchemaField;
  variables: Record<string, unknown>;
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
export function buildDocument({ operationName, rootField, variables, selectionText }: BuildDocumentInput): BuildDocumentResult {
  const variableNames = Object.keys(variables);
  const argsByName = new Map(rootField.args.map((a) => [a.name, a]));

  const variableDefinitions = variableNames
    .filter((name) => argsByName.has(name))
    .map((name) => `$${name}: ${typeRefToString(argsByName.get(name)!.type)}`)
    .join(', ');

  const fieldArguments = variableNames
    .filter((name) => argsByName.has(name))
    .map((name) => `${name}: $${name}`)
    .join(', ');

  const body = selectionText.trim().length > 0 ? selectionText : '__typename';

  const argsClause = fieldArguments ? `(${fieldArguments})` : '';
  const varsClause = variableDefinitions ? `(${variableDefinitions})` : '';

  const rawText = `query ${operationName}${varsClause} { ${rootField.name}${argsClause} { ${body} } }`;

  try {
    const documentText = print(parse(rawText));
    return { success: true, documentText };
  } catch (error) {
    return { success: false, errorMessage: error instanceof Error ? error.message : 'Failed to build query document.' };
  }
}
