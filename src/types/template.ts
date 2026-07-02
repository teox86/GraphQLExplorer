import type { QueryConfiguration } from './query';

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Endpoint this template was built against, shown for context (not enforced). */
  endpointUrl: string;
  configuration: QueryConfiguration;
  generatedQueryText: string;
  variables: Record<string, unknown>;
}
