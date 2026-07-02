import { useMemo, useState } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Card, EmptyState, SectionHeading, TextInput } from '../ui';
import { buildCategorizedRootQueries } from '../../governance/resolve';
import type { RootQueryTag } from '../../types';

const TAG_TONE: Record<RootQueryTag, 'blue' | 'amber' | 'red' | 'purple' | 'green' | 'slate'> = {
  'time-based': 'blue',
  'requires-date-range': 'blue',
  'returns-list': 'slate',
  'returns-kpi': 'green',
  'returns-report': 'purple',
  advanced: 'amber',
  expensive: 'red',
  dimensional: 'purple',
};

export function StepRootSelection() {
  const { state, setRootField, setStep } = useWizard();
  const { schemaModel, governance, config } = state;
  const [search, setSearch] = useState('');

  const categorized = useMemo(() => {
    if (!schemaModel) return [];
    return buildCategorizedRootQueries(governance, schemaModel);
  }, [schemaModel, governance]);

  const relevantGroups = useMemo(() => {
    const groups = config.intentCategoryId
      ? categorized.filter((g) => g.category.id === config.intentCategoryId)
      : categorized;

    if (!search.trim()) return groups;
    const term = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        queries: g.queries.filter(
          (q) => q.label.toLowerCase().includes(term) || q.field.name.toLowerCase().includes(term) || q.description.toLowerCase().includes(term),
        ),
      }))
      .filter((g) => g.queries.length > 0);
  }, [categorized, config.intentCategoryId, search]);

  if (!schemaModel) {
    return <EmptyState title="No schema loaded" description="Go back to Connection and load a schema first." />;
  }

  function choose(fieldName: string) {
    setRootField(fieldName);
    setStep(4);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title="Select a query" description="Choose the specific data you want to retrieve." />
      <TextInput value={search} onChange={setSearch} placeholder="Search queries by name or description…" />

      <div className="flex flex-col gap-6">
        {relevantGroups.map(({ category, queries }) => (
          <div key={category.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{category.label}</p>
            <div className="flex flex-col gap-2">
              {queries.map((rq) => (
                <button key={rq.field.name} onClick={() => choose(rq.field.name)} className="text-left">
                  <Card
                    className={`p-4 transition-colors hover:border-slate-400 hover:shadow-md ${
                      config.rootFieldName === rq.field.name ? 'border-slate-900 ring-1 ring-slate-900' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{rq.label}</p>
                        <p className="font-mono text-[11px] text-slate-400">{rq.field.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{rq.description}</p>
                        {rq.override?.recommendedUsage && (
                          <p className="mt-1 text-xs italic text-slate-400">{rq.override.recommendedUsage}</p>
                        )}
                      </div>
                    </div>
                    {rq.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rq.tags.map((tag) => (
                          <Badge key={tag} tone={TAG_TONE[tag] ?? 'slate'}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {relevantGroups.length === 0 && <EmptyState title="No matching queries" description="Try a different search term or category." />}
    </div>
  );
}
