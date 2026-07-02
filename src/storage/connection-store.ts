import type { GraphQLConnectionConfig } from '../types';

const STORAGE_KEY = 'graphql-explorer.connection.v1';

/**
 * Persists the last-used connection so the wizard doesn't reset on reload.
 * Auth header values are stored too since this is a local developer tool;
 * do not reuse this pattern as-is for a multi-user deployment.
 */
export function loadLastConnection(): GraphQLConnectionConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GraphQLConnectionConfig;
  } catch {
    return null;
  }
}

export function saveLastConnection(config: GraphQLConnectionConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
