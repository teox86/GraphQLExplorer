import { useMemo } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Button, Card, EmptyState, SectionHeading, WarningBanner } from '../ui';
import { findRootQueryField } from '../../schema/schema-utils';
import { flattenArguments } from '../../schema/flatten-arguments';
import { getDimensionsForRootQuery, getRootQueryOverride } from '../../governance/resolve';
import { ArgumentControl } from '../query/ArgumentControl';
import { TimeRangePicker } from '../query/TimeRangePicker';

export function StepArguments() {
  const { state, setArgumentValue, removeArgumentValue, setTimeRange, setStep } = useWizard();
  const { schemaModel, governance, config } = state;

  const rootField = schemaModel && config.rootFieldName ? findRootQueryField(schemaModel, config.rootFieldName) : null;
  const rootOverride = config.rootFieldName ? getRootQueryOverride(governance, config.rootFieldName) : null;
  const dimensions = useMemo(
    () => (config.rootFieldName ? getDimensionsForRootQuery(governance, config.rootFieldName) : []),
    [governance, config.rootFieldName],
  );

  const coveredPaths = useMemo(() => {
    const paths = new Set<string>();
    if (config.timeRange?.mapping) {
      paths.add(config.timeRange.mapping.startPath);
      paths.add(config.timeRange.mapping.endPath);
    }
    if (rootOverride?.groupByArgumentPath) paths.add(rootOverride.groupByArgumentPath);
    if (rootOverride?.timeBucketArgumentPath) paths.add(rootOverride.timeBucketArgumentPath);
    for (const dim of dimensions) {
      if (dim.argumentPath) paths.add(dim.argumentPath);
    }
    return paths;
  }, [config.timeRange, rootOverride, dimensions]);

  const flatArgs = useMemo(() => {
    if (!schemaModel || !rootField) return [];
    return flattenArguments(schemaModel, rootField.args).filter((fa) => !coveredPaths.has(fa.path));
  }, [schemaModel, rootField, coveredPaths]);

  if (!schemaModel || !rootField) {
    return <EmptyState title="No query selected" description="Go back and choose a root query first." />;
  }

  const valuesByPath = new Map(config.arguments.map((a) => [a.path, a.value]));

  function handleArgChange(path: string, argName: string, value: unknown) {
    if (value === undefined) {
      removeArgumentValue(path);
      return;
    }
    setArgumentValue({ argName, path, kind: 'unknown', value });
  }

  const isTimeBased = rootOverride?.isTimeBased ?? false;
  const requiresTimeRange = rootOverride?.requiresTimeRange ?? false;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Set required parameters"
        description="Fill in the arguments for this query. Values become GraphQL variables rather than being inlined into the query text."
      />

      {isTimeBased && config.timeRange?.mapping && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">Time range</p>
            {requiresTimeRange && <Badge tone="red">Required</Badge>}
          </div>
          <p className="mb-3 text-sm text-slate-500">
            This query returns time-based data. Choose a preset or a custom range - this will be sent as GraphQL variables.
          </p>
          <TimeRangePicker value={config.timeRange} mapping={config.timeRange.mapping} onChange={setTimeRange} />
          {requiresTimeRange && !config.timeRange.start && <WarningBanner severity="hard">A time range is required to run this query.</WarningBanner>}
        </Card>
      )}

      {flatArgs.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Other parameters</p>
          <div className="flex flex-col gap-4">
            {flatArgs.map((fa) => (
              <div key={fa.path}>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  {fa.path}
                  {fa.arg.isRequired && <span className="text-red-500">*</span>}
                </label>
                {fa.arg.description && <p className="mb-1 text-xs text-slate-400">{fa.arg.description}</p>}
                <ArgumentControl
                  model={schemaModel}
                  flatArg={fa}
                  value={valuesByPath.get(fa.path)}
                  onChange={(v) => handleArgChange(fa.path, fa.arg.name, v)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {flatArgs.length === 0 && !isTimeBased && (
        <EmptyState title="No additional parameters" description="This query does not require any extra arguments." />
      )}

      <div className="flex justify-end">
        <Button onClick={() => setStep(5)}>Continue</Button>
      </div>
    </div>
  );
}
