import { useMemo, useState, type ReactNode } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Button, Card, EmptyState, SectionHeading, TextInput, WarningBanner } from '../ui';
import { buildDimensionHierarchy, getDimensionsForRootQuery, getRootQueryOverride } from '../../governance/resolve';
import type { DimensionConfig } from '../../types';

function DimensionRow({
  dimension,
  depth,
  value,
  onChange,
  onClear,
}: {
  dimension: DimensionConfig;
  depth: number;
  value: unknown;
  onChange: (value: unknown) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ marginLeft: depth * 20 }} className="flex items-start gap-3 py-2">
      <div className="w-40 shrink-0">
        <p className="text-sm font-medium text-slate-800">{dimension.label}</p>
        {dimension.description && <p className="text-xs text-slate-400">{dimension.description}</p>}
        {!dimension.argumentPath && <Badge tone="slate">organizational</Badge>}
      </div>
      <div className="flex-1">
        <TextInput
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => (v ? onChange(v) : onClear())}
          placeholder={dimension.argumentPath ? `${dimension.label} ID` : 'Used to narrow child options'}
        />
      </div>
    </div>
  );
}

export function StepDimensions() {
  const { state, addDimensionFilter, removeDimensionFilter, setGroupBy, setTimeBucket, setStep } = useWizard();
  const { governance, config } = state;

  const rootOverride = config.rootFieldName ? getRootQueryOverride(governance, config.rootFieldName) : null;
  const dimensions = useMemo(
    () => (config.rootFieldName ? getDimensionsForRootQuery(governance, config.rootFieldName) : []),
    [governance, config.rootFieldName],
  );
  const hierarchy = useMemo(() => buildDimensionHierarchy(dimensions), [dimensions]);

  const filtersByKey = new Map(config.dimensionFilters.map((f) => [f.dimensionKey, f.value]));
  const groupCandidates = dimensions.filter((d) => d.supportsGroupBy);

  const [showAdvanced, setShowAdvanced] = useState(false);

  function renderLevel(parentKey: string | null, depth: number): ReactNode {
    const nodes = hierarchy.get(parentKey) ?? [];
    return nodes.map((dim) => (
      <div key={dim.key}>
        {dim.key === 'kpi' ? (
          <KpiPicker
            selected={(filtersByKey.get('kpi') as string[]) ?? []}
            familyFilter={filtersByKey.get('kpiFamily') as string | undefined}
            onChange={(keys) =>
              keys.length > 0
                ? addDimensionFilter({ dimensionKey: 'kpi', operator: 'in', value: keys })
                : removeDimensionFilter('kpi')
            }
          />
        ) : dim.key === 'kpiFamily' ? (
          <KpiFamilyPicker
            selected={(filtersByKey.get('kpiFamily') as string) ?? ''}
            onChange={(key) => (key ? addDimensionFilter({ dimensionKey: 'kpiFamily', operator: 'eq', value: key }) : removeDimensionFilter('kpiFamily'))}
          />
        ) : (
          <DimensionRow
            dimension={dim}
            depth={depth}
            value={filtersByKey.get(dim.key)}
            onChange={(v) => addDimensionFilter({ dimensionKey: dim.key, operator: 'eq', value: v })}
            onClear={() => removeDimensionFilter(dim.key)}
          />
        )}
        {renderLevel(dim.key, depth + 1)}
      </div>
    ));
  }

  if (dimensions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeading title="Dimensions & filters" description="This query has no configured dimensions." />
        <EmptyState title="No dimensions available" description="This root query does not have any business dimensions configured." />
        <div className="flex justify-end">
          <Button onClick={() => setStep(6)}>Continue</Button>
        </div>
      </div>
    );
  }

  const missingRequired = (rootOverride?.requiredFilterDimensionKeys ?? []).filter((key) => !filtersByKey.has(key));

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Dimensions & filters"
        description="Narrow down and organize the result. Hierarchical dimensions (e.g. Site > Area > Line > Equipment) are shown indented."
      />

      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Filters</p>
        <div className="divide-y divide-slate-100">{renderLevel(null, 0)}</div>
        {missingRequired.length > 0 && (
          <div className="mt-3">
            <WarningBanner severity="soft">
              Recommended: set a filter for {missingRequired.map((k) => governance.dimensions.find((d) => d.key === k)?.label ?? k).join(', ')}.
            </WarningBanner>
          </div>
        )}
      </Card>

      {groupCandidates.length > 0 && rootOverride?.groupByArgumentPath && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Group by</p>
          <div className="flex flex-wrap gap-2">
            {groupCandidates.map((dim) => {
              const active = config.groupByDimensionKeys.includes(dim.key);
              return (
                <button
                  key={dim.key}
                  type="button"
                  onClick={() =>
                    setGroupBy(active ? config.groupByDimensionKeys.filter((k) => k !== dim.key) : [...config.groupByDimensionKeys, dim.key])
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                    active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {dim.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {rootOverride?.timeBucketArgumentPath && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Time bucket / granularity</p>
          <div className="flex flex-wrap gap-2">
            {governance.timeBuckets.map((bucket) => {
              const active = config.timeBucket === bucket.key;
              return (
                <button
                  key={bucket.key}
                  type="button"
                  onClick={() => setTimeBucket(active ? null : bucket.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                    active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {bucket.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <button className="self-start text-xs font-medium text-slate-500 underline" onClick={() => setShowAdvanced((v) => !v)}>
        {showAdvanced ? 'Hide advanced filters' : 'Show advanced filters'}
      </button>
      {showAdvanced && (
        <Card className="p-4">
          <p className="text-sm text-slate-500">
            Advanced conditional filters (operators such as greater-than, contains, not-equal) can be added per dimension in a future iteration. All
            filters above currently apply as exact-match (or "in" for multi-select) conditions.
          </p>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setStep(6)}>Continue</Button>
      </div>
    </div>
  );
}

function KpiFamilyPicker({ selected, onChange }: { selected: string; onChange: (key: string) => void }) {
  const { state } = useWizard();
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-40 shrink-0">
        <p className="text-sm font-medium text-slate-800">KPI Family</p>
        <p className="text-xs text-slate-400">Narrows the KPI list below.</p>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {state.governance.kpiFamilies.map((family) => (
          <button
            key={family.key}
            type="button"
            onClick={() => onChange(selected === family.key ? '' : family.key)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
              selected === family.key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {family.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KpiPicker({
  selected,
  familyFilter,
  onChange,
}: {
  selected: string[];
  familyFilter: string | undefined;
  onChange: (keys: string[]) => void;
}) {
  const { state } = useWizard();
  const kpis = state.governance.kpis.filter((k) => !familyFilter || k.familyKey === familyFilter);
  const selectedSet = new Set(selected);

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-40 shrink-0">
        <p className="text-sm font-medium text-slate-800">KPI(s)</p>
        <p className="text-xs text-slate-400">Required - select at least one.</p>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {kpis.map((kpi) => {
          const active = selectedSet.has(kpi.key);
          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => onChange(active ? selected.filter((k) => k !== kpi.key) : [...selected, kpi.key])}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
              }`}
            >
              {kpi.label}
              {kpi.unit ? ` (${kpi.unit})` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
