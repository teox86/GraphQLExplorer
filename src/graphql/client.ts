import { GraphQLClient } from 'graphql-request';
import type { GraphQLConnectionConfig } from '../types';

export function buildHeaderRecord(config: GraphQLConnectionConfig): Record<string, string> {
  const record: Record<string, string> = {};
  for (const header of config.headers) {
    if (header.key.trim().length > 0) {
      record[header.key.trim()] = header.value;
    }
  }
  return record;
}

export function createGraphQLClient(config: GraphQLConnectionConfig): GraphQLClient {
  return new GraphQLClient(config.endpointUrl, {
    headers: buildHeaderRecord(config),
  });
}

export interface ExecuteQueryResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: { message: string; path?: (string | number)[] }[];
  networkError?: string;
  durationMs: number;
}

export async function executeGraphQLQuery<T = unknown>(
  config: GraphQLConnectionConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<ExecuteQueryResult<T>> {
  const client = createGraphQLClient(config);
  const startedAt = performance.now();
  try {
    const data = await client.request<T>(query, variables);
    return { success: true, data, durationMs: performance.now() - startedAt };
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { errors?: { message: string; path?: (string | number)[] }[] } }).response;
      if (response?.errors && response.errors.length > 0) {
        return { success: false, errors: response.errors, durationMs };
      }
    }
    return {
      success: false,
      networkError: error instanceof Error ? error.message : 'Unknown network error',
      durationMs,
    };
  }
}

/** Lightweight connectivity probe used by the "Test connection" button. */
export async function testConnection(config: GraphQLConnectionConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const client = createGraphQLClient(config);
    await client.request('query __ConnectionProbe { __typename }');
    return { ok: true, message: 'Connection successful.' };
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { status?: number; errors?: { message: string }[] } }).response;
      if (response?.errors?.length) {
        return { ok: false, message: response.errors[0].message };
      }
      if (response?.status) {
        return { ok: false, message: `Server responded with HTTP ${response.status}.` };
      }
    }
    return { ok: false, message: error instanceof Error ? error.message : 'Unable to reach endpoint.' };
  }
}
