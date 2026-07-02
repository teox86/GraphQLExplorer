export interface GraphQLHeader {
  key: string;
  value: string;
}

export interface GraphQLConnectionConfig {
  endpointUrl: string;
  headers: GraphQLHeader[];
  /** Optional friendly name shown in the UI. */
  label?: string;
}

export type SchemaLoadStrategy = 'introspection' | 'manual-sdl' | 'manual-json' | 'mock';

export interface SchemaLoadResult {
  strategy: SchemaLoadStrategy;
  success: boolean;
  errorMessage?: string;
}
