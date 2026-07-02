import type { QueryConfiguration, SavedTemplate } from '../types';

const STORAGE_KEY = 'graphql-explorer.templates.v1';

/**
 * Abstraction over template persistence. The local implementation below
 * uses browser storage; swapping to a backend API later only requires a new
 * class implementing this interface - callers never touch localStorage
 * directly.
 */
export interface TemplateStore {
  list(): SavedTemplate[];
  get(id: string): SavedTemplate | null;
  save(input: {
    name: string;
    endpointUrl: string;
    configuration: QueryConfiguration;
    generatedQueryText: string;
    variables: Record<string, unknown>;
  }): SavedTemplate;
  rename(id: string, name: string): SavedTemplate | null;
  remove(id: string): void;
}

function readAll(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(templates: SavedTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const localTemplateStore: TemplateStore = {
  list() {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id) {
    return readAll().find((t) => t.id === id) ?? null;
  },

  save({ name, endpointUrl, configuration, generatedQueryText, variables }) {
    const templates = readAll();
    const now = new Date().toISOString();
    const template: SavedTemplate = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      endpointUrl,
      configuration,
      generatedQueryText,
      variables,
    };
    templates.push(template);
    writeAll(templates);
    return template;
  },

  rename(id, name) {
    const templates = readAll();
    const template = templates.find((t) => t.id === id);
    if (!template) return null;
    template.name = name;
    template.updatedAt = new Date().toISOString();
    writeAll(templates);
    return template;
  },

  remove(id) {
    writeAll(readAll().filter((t) => t.id !== id));
  },
};
