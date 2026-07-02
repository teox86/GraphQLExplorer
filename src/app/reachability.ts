import type { WizardState } from './wizard-context';

export function isStepReachable(state: WizardState, stepId: number): boolean {
  switch (stepId) {
    case 1:
      return true;
    case 2:
    case 3:
      return state.schemaModel !== null;
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
      return state.config.rootFieldName !== null;
    default:
      return false;
  }
}
