import { useMemo } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Card } from '../ui';
import { estimateComplexity } from '../../complexity/estimate';
import { getRootQueryOverride, resolveRootQuery } from '../../governance/resolve';
import { findRootQueryField } from '../../schema/schema-utils';
import { TIME_RANGE_PRESET_LABELS } from '../../query-builder/time-range-resolver';

export function SummaryPanel() {
  const { state } = useWizard();
  const { connection, schemaModel, governance, config, schemaSource } = state;

  const rootQueryInfo = useMemo(() => {
    if (!schemaModel || !config.rootFieldName) return null;
    const field = findRootQueryField(schemaModel, config.rootFieldName);
    if (!field) return null;
    return resolveRootQuery(governance, field);
  }, [schemaModel, governance, config.rootFieldName]);

  const rootOverride = config.rootFieldName ? getRootQueryOverride(governance, config.rootFieldName) : null;

  const complexity = useMemo(() => estimateComplexity(config, schemaModel, governance), [config, schemaModel, governance]);

  return (
    <aside className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Current configuration</p>

      <Card className="p-3">
        <p className="text-xs font-medium text-slate-400">Endpoint</p>
        <p className="mt-0.5 truncate text-sm text-slate-800" title={connection.endpointUrl}>
          {connection.endpointUrl || 'Not connected'}
        </p>
        {schemaSource && (
          <div className="mt-2">
            <Badge tone={schemaSource === 'introspection' ? 'green' : 'blue'}>{schemaSource}</Badge>
          </div>
        )}
      </Card>

      <Card className="p-3">
        <p className="text-xs font-medium text-slate-400">Query</p>
        <p className="mt-0.5 text-sm text-slate-800">{rootQueryInfo?.label ?? 'Not selected'}</p>
        {rootQueryInfo && <p className="mt-0.5 font-mono text-[11px] text-slate-400">{config.rootFieldName}</p>}
        {rootQueryInfo && rootQueryInfo.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {rootQueryInfo.tags.map((tag) => (
              <Badge key={tag} tone="purple">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {rootOverride?.isTimeBased && (
        <Card className="p-3">
          <p className="text-xs font-medium text-slate-400">Time range</p>
          {config.timeRange ? (
            <p className="mt-0.5 text-sm text-slate-800">{TIME_RANGE_PRESET_LABELS[config.timeRange.preset]}</p>
          ) : (
            <p className="mt-0.5 text-sm text-red-600">Not set</p>
          )}
        </Card>
      )}

      <Card className="p-3">
        <p className="text-xs font-medium text-slate-400">Filters & grouping</p>
        <p className="mt-0.5 text-sm text-slate-800">
          {config.dimensionFilters.length} filter{config.dimensionFilters.length === 1 ? '' : 's'}
          {config.groupByDimensionKeys.length > 0 && `, grouped by ${config.groupByDimensionKeys.length}`}
        </p>
      </Card>

      <Card className="p-3">
        <p className="text-xs font-medium text-slate-400">Field selection</p>
        <p className="mt-0.5 text-sm text-slate-800">
          {complexity.selectedFieldCount} field{complexity.selectedFieldCount === 1 ? '' : 's'} · depth {complexity.maxDepth}
        </p>
      </Card>

      {complexity.warnings.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-medium text-slate-400">Warnings</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {complexity.warnings.map((w) => (
              <Badge key={w.code} tone={w.severity === 'hard' ? 'red' : 'amber'}>
                {w.code.replace(/_/g, ' ').toLowerCase()}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </aside>
  );
}
