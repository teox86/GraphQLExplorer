import { useMemo } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Card, EmptyState, SectionHeading } from '../ui';
import { buildCategorizedRootQueries } from '../../governance/resolve';

export function StepDataIntent() {
  const { state, setIntentCategory, setStep } = useWizard();
  const { schemaModel, governance } = state;

  const categorized = useMemo(() => {
    if (!schemaModel) return [];
    return buildCategorizedRootQueries(governance, schemaModel);
  }, [schemaModel, governance]);

  if (!schemaModel) {
    return <EmptyState title="No schema loaded" description="Go back to Connection and load a schema first." />;
  }

  function choose(categoryId: string) {
    setIntentCategory(categoryId);
    setStep(3);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="What kind of data do you need?"
        description="Pick a high-level category to narrow down the available queries. Categories are configurable and can be inferred from schema metadata or overridden locally."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categorized.map(({ category, queries }) => (
          <button key={category.id} onClick={() => choose(category.id)} className="text-left">
            <Card className="h-full p-4 transition-colors hover:border-slate-400 hover:shadow-md">
              <p className="text-sm font-semibold text-slate-900">{category.label}</p>
              <p className="mt-1 text-sm text-slate-500">{category.description}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">
                {queries.length} available quer{queries.length === 1 ? 'y' : 'ies'}
              </p>
            </Card>
          </button>
        ))}
      </div>
      {categorized.length === 0 && (
        <EmptyState title="No categorized queries found" description="Check the governance configuration or the schema's root query fields." />
      )}
    </div>
  );
}
