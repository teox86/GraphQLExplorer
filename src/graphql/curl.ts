import type { GraphQLConnectionConfig } from '../types';
import { buildHeaderRecord } from './client';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildCurlCommand(
  connection: GraphQLConnectionConfig,
  query: string,
  variables: Record<string, unknown>,
  operationName: string,
): string {
  const headers = buildHeaderRecord(connection);
  const body = JSON.stringify({ query, variables, operationName }, null, 2);

  const lines = [`curl -X POST ${shellQuote(connection.endpointUrl)}`, `  -H ${shellQuote('Content-Type: application/json')}`];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  -H ${shellQuote(`${key}: ${value}`)}`);
  }
  lines.push(`  -d ${shellQuote(body)}`);
  return lines.join(' \\\n');
}
