import type { GraphQLConnectionConfig } from '../types';
import { createGraphQLClient } from './client';
import { INTROSPECTION_QUERY } from './introspection-query';
import type { RawIntrospectionResponse } from '../schema/raw-introspection-types';

export interface FetchIntrospectionResult {
  success: boolean;
  raw?: RawIntrospectionResponse;
  errorMessage?: string;
}

export async function fetchIntrospectionSchema(
  config: GraphQLConnectionConfig,
): Promise<FetchIntrospectionResult> {
  const client = createGraphQLClient(config);
  try {
    const raw = await client.request<RawIntrospectionResponse>(INTROSPECTION_QUERY);
    if (!raw.__schema) {
      return { success: false, errorMessage: 'Server did not return a __schema object. Introspection may be disabled.' };
    }
    return { success: true, raw };
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { errors?: { message: string }[] } }).response;
      if (response?.errors?.length) {
        return { success: false, errorMessage: response.errors[0].message };
      }
    }
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Introspection request failed.',
    };
  }
}
