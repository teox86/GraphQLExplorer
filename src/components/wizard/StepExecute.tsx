import { useMemo } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Button, Card, EmptyState, SectionHeading, WarningBanner } from '../ui';
import { generateQuery } from '../../query-builder';
import { estimateComplexity } from '../../complexity/estimate';
import { executeGraphQLQuery } from '../../graphql/client';
import { friendlyErrorMessage } from '../../graphql/error-messages';
import { ResultView } from '../results/ResultView';

export function StepExecute() {
  const { state, executionStart, executionDone, setStep } = useWizard();
  const { schemaModel, governance, config, connection, execution } = state;

  const complexity = useMemo(() => estimateComplexity(config, schemaModel, governance), [config, schemaModel, governance]);
  const generated = useMemo(() => (schemaModel ? generateQuery(config, schemaModel, governance) : null), [config, schemaModel, governance]);

  if (!schemaModel || !generated?.success || !generated.query) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeading title="Execute query" />
        <EmptyState title="Query not ready" description="Go back to Query Preview and resolve any issues first." />
      </div>
    );
  }

  const canExecute = !complexity.blocksExecution;

  async function runQuery() {
    executionStart();
    const result = await executeGraphQLQuery(connection, generated!.query!.documentText, generated!.query!.variables);
    executionDone(result);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title="Execute & inspect" description="Run the generated query against your endpoint and inspect the result." />

      {!canExecute && (
        <WarningBanner severity="hard">
          Execution is blocked because of unresolved safety warnings. Go back to Query Preview to review and, if appropriate, override soft warnings.
        </WarningBanner>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Button onClick={runQuery} disabled={!canExecute || execution.loading}>
            {execution.loading ? 'Running…' : 'Run query'}
          </Button>
          {execution.result && (
            <Badge tone={execution.result.success ? 'green' : 'red'}>
              {execution.result.success ? `Success in ${Math.round(execution.result.durationMs)}ms` : 'Failed'}
            </Badge>
          )}
        </div>
      </Card>

      {execution.result && !execution.result.success && (
        <Card className="p-4">
          <WarningBanner severity="hard">{friendlyErrorMessage(execution.result)}</WarningBanner>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-slate-400">Raw error details</summary>
            <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-slate-900 p-2 text-[11px] text-slate-100">
              {JSON.stringify(execution.result.errors ?? execution.result.networkError, null, 2)}
            </pre>
          </details>
        </Card>
      )}

      {execution.result?.success && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Result</p>
          <ResultView data={execution.result.data} />
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setStep(9)}>
          Continue to save / reuse
        </Button>
      </div>
    </div>
  );
}
