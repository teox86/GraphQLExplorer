export const WIZARD_STEPS = [
  { id: 1, key: 'connection', label: 'Connection', description: 'Connect to a GraphQL endpoint' },
  { id: 2, key: 'intent', label: 'Data Intent', description: 'What kind of data do you need?' },
  { id: 3, key: 'root', label: 'Query Selection', description: 'Pick the specific query' },
  { id: 4, key: 'arguments', label: 'Parameters', description: 'Required arguments & time range' },
  { id: 5, key: 'dimensions', label: 'Filters & Dimensions', description: 'Narrow down the result' },
  { id: 6, key: 'fields', label: 'Field Selection', description: 'Choose what to return' },
  { id: 7, key: 'preview', label: 'Query Preview', description: 'Review the generated query' },
  { id: 8, key: 'execute', label: 'Execute & Inspect', description: 'Run it and view results' },
  { id: 9, key: 'templates', label: 'Save / Reuse', description: 'Save this as a template' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];
