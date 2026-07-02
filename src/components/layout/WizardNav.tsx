import { WIZARD_STEPS } from '../../app/wizard-steps';
import { useWizard } from '../../app/wizard-context';
import { isStepReachable } from '../../app/reachability';

export function WizardNav() {
  const { state, setStep } = useWizard();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <div className="px-2 pb-3 pt-1">
        <p className="text-sm font-semibold text-slate-900">Query Builder</p>
        <p className="text-xs text-slate-400">Guided GraphQL exploration</p>
      </div>
      {WIZARD_STEPS.map((step) => {
        const reachable = isStepReachable(state, step.id);
        const active = state.step === step.id;
        return (
          <button
            key={step.id}
            disabled={!reachable}
            onClick={() => setStep(step.id)}
            className={`group flex items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                active ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
              }`}
            >
              {step.id}
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-sm font-medium ${active ? 'text-white' : 'text-slate-800'}`}>{step.label}</span>
              <span className={`block truncate text-xs ${active ? 'text-slate-300' : 'text-slate-400'}`}>{step.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
