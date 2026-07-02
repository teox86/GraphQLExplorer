import { buildSchema, introspectionFromSchema } from 'graphql';
import type { IntrospectionSchemaModel } from '../types';
import { parseIntrospectionResponse } from './introspection-parser';
import type { RawIntrospectionResponse } from './raw-introspection-types';

export interface SdlParseResult {
  success: boolean;
  model?: IntrospectionSchemaModel;
  errorMessage?: string;
}

/** Fallback path for endpoints where introspection is disabled: parse a hand-provided SDL document. */
export function parseSchemaFromSdl(sdlText: string): SdlParseResult {
  try {
    const schema = buildSchema(sdlText);
    const introspection = introspectionFromSchema(schema) as unknown as RawIntrospectionResponse;
    const model = parseIntrospectionResponse(introspection);
    model.source = 'sdl';
    return { success: true, model };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Failed to parse SDL document.',
    };
  }
}

/** Fallback path for a manually pasted introspection JSON export (e.g. from another tool). */
export function parseSchemaFromIntrospectionJson(jsonText: string): SdlParseResult {
  try {
    const parsed = JSON.parse(jsonText) as RawIntrospectionResponse | { data: RawIntrospectionResponse };
    const raw: RawIntrospectionResponse = 'data' in parsed ? parsed.data : parsed;
    if (!raw.__schema) {
      return { success: false, errorMessage: 'JSON does not contain a __schema field.' };
    }
    const model = parseIntrospectionResponse(raw);
    model.source = 'sdl';
    return { success: true, model };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Failed to parse introspection JSON.',
    };
  }
}
