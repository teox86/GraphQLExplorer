import { useMemo } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Button, Card, CopyButton, EmptyState, SectionHeading, WarningBanner } from '../ui';
import { generateQuery } from '../../query-builder';
import { estimateComplexity } from '../../complexity/estimate';
import { buildCurlCommand } from '../../graphql/curl';

export function StepPreview() {
  const { state, setOverrideWarnings, setStep } = useWizard();
  const { schemaModel, governance, config, connection } = state;

  const complexity = useMemo(() => estimateComplexity(config, schemaModel, governance), [config, schemaModel, governance]);

  const generated = useMemo(() => {
    if (!schemaModel) return null;
    return generateQuery(config, schemaModel, governance);
  }, [config, schemaModel, governance]);

  if (!schemaModel) {
    return <EmptyState title="No schema loaded" />;
  }

  if (!generated?.success || !generated.query) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeading title="Query preview" />
        <WarningBanner severity="hard">{generated?.errorMessage ?? 'Unable to generate a query yet.'}</WarningBanner>
      </div>
    );
  }

  const { documentText, variables, operationName } = generated.query;
  const variablesText = JSON.stringify(variables, null, 2);
  const curlText = buildCurlCommand(connection, documentText, variables, operationName);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title="Query preview" description="Review the generated GraphQL document and variables before execution." />

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-slate-900">Complexity indicators</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="slate">{complexity.selectedFieldCount} fields selected</Badge>
          <Badge tone="slate">nesting depth {complexity.maxDepth}</Badge>
          <Badge tone="slate">{complexity.listFieldCount} list fields</Badge>
          <Badge tone={complexity.hasTimeRange ? 'green' : 'slate'}>{complexity.hasTimeRange ? 'time range set' : 'no time range'}</Badge>
        </div>
        {complexity.warnings.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {complexity.warnings.map((w) => (
              <WarningBanner key={w.code} severity={w.severity}>
                {w.message}
              </WarningBanner>
            ))}
            {complexity.warnings.some((w) => w.severity === 'soft') && (
              <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={config.overrideWarnings} onChange={(e) => setOverrideWarnings(e.target.checked)} />
                I understand the risks - allow me to run this query anyway
              </label>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">GraphQL query</p>
          <CopyButton text={documentText} label="Copy query" />
        </div>
        <pre className="max-h-80 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
          <code>{documentText}</code>
        </pre>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Variables</p>
          <CopyButton text={variablesText} label="Copy variables" />
        </div>
        <pre className="max-h-60 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
          <code>{variablesText}</code>
        </pre>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">cURL</p>
          <CopyButton text={curlText} label="Copy as cURL" />
        </div>
        <pre className="max-h-40 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
          <code>{curlText}</code>
        </pre>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setStep(8)}>Continue to execution</Button>
      </div>
    </div>
  );
}
