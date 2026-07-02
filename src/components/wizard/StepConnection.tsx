import { useState } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Button, Card, SectionHeading, TextInput } from '../ui';
import { testConnection } from '../../graphql/client';
import { fetchIntrospectionSchema } from '../../graphql/fetch-schema';
import { parseIntrospectionResponse } from '../../schema/introspection-parser';
import { parseSchemaFromIntrospectionJson, parseSchemaFromSdl } from '../../schema/sdl-parser';
import { MOCK_SCHEMA_SDL } from '../../config/mock-schema';
import { saveLastConnection } from '../../storage/connection-store';

type FallbackMode = 'none' | 'sdl' | 'json';

export function StepConnection() {
  const { state, setConnection, schemaLoading, schemaLoaded, schemaError, setStep } = useWizard();
  const { connection, schemaModel, schemaError: schemaErrorMsg, schemaLoading: isSchemaLoading } = state;

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [fallbackMode, setFallbackMode] = useState<FallbackMode>('none');
  const [fallbackText, setFallbackText] = useState('');

  function updateHeader(index: number, key: string, value: string) {
    const headers = connection.headers.map((h, i) => (i === index ? { key, value } : h));
    setConnection({ ...connection, headers });
  }

  function addHeader() {
    setConnection({ ...connection, headers: [...connection.headers, { key: '', value: '' }] });
  }

  function removeHeader(index: number) {
    setConnection({ ...connection, headers: connection.headers.filter((_, i) => i !== index) });
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(connection);
    setTestResult(result);
    setTesting(false);
  }

  async function handleIntrospect() {
    schemaLoading();
    saveLastConnection(connection);
    const result = await fetchIntrospectionSchema(connection);
    if (!result.success || !result.raw) {
      schemaError(result.errorMessage ?? 'Introspection failed.');
      return;
    }
    const model = parseIntrospectionResponse(result.raw);
    schemaLoaded(model, 'introspection');
  }

  function handleLoadMockSchema() {
    schemaLoading();
    const result = parseSchemaFromSdl(MOCK_SCHEMA_SDL);
    if (!result.success || !result.model) {
      schemaError(result.errorMessage ?? 'Failed to load mock schema.');
      return;
    }
    schemaLoaded({ ...result.model, source: 'mock' }, 'mock');
  }

  function handleParseFallback() {
    schemaLoading();
    const result = fallbackMode === 'sdl' ? parseSchemaFromSdl(fallbackText) : parseSchemaFromIntrospectionJson(fallbackText);
    if (!result.success || !result.model) {
      schemaError(result.errorMessage ?? 'Failed to parse schema.');
      return;
    }
    schemaLoaded(result.model, fallbackMode === 'sdl' ? 'manual-sdl' : 'manual-json');
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Connect to a GraphQL endpoint"
        description="Enter the endpoint URL for the GraphQL API you want to explore. If introspection is disabled on the server, you can load a schema manually below."
      />

      <Card className="p-4">
        <label className="text-xs font-medium text-slate-500">Endpoint URL</label>
        <div className="mt-1">
          <TextInput
            value={connection.endpointUrl}
            onChange={(v) => setConnection({ ...connection, endpointUrl: v })}
            placeholder="https://api.example.com/graphql"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500">HTTP headers (e.g. Authorization)</label>
          <Button variant="ghost" size="sm" onClick={addHeader}>
            + Add header
          </Button>
        </div>
        <div className="mt-1 flex flex-col gap-2">
          {connection.headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <TextInput value={header.key} onChange={(v) => updateHeader(index, v, header.value)} placeholder="Header name" className="w-1/3" />
              <TextInput value={header.value} onChange={(v) => updateHeader(index, header.key, v)} placeholder="Value, e.g. Bearer <token>" />
              <Button variant="ghost" size="sm" onClick={() => removeHeader(index)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleTestConnection} disabled={!connection.endpointUrl || testing}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
          <Button onClick={handleIntrospect} disabled={!connection.endpointUrl || isSchemaLoading}>
            {isSchemaLoading ? 'Loading schema…' : 'Introspect schema'}
          </Button>
          {testResult && (
            <Badge tone={testResult.ok ? 'green' : 'red'}>{testResult.message}</Badge>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeading
          title="No live endpoint yet?"
          description="Load the bundled example schema to explore the builder, or paste a schema manually if introspection is disabled on your server."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleLoadMockSchema}>
            Load example schema
          </Button>
          <Button variant="secondary" onClick={() => setFallbackMode(fallbackMode === 'sdl' ? 'none' : 'sdl')}>
            Paste SDL
          </Button>
          <Button variant="secondary" onClick={() => setFallbackMode(fallbackMode === 'json' ? 'none' : 'json')}>
            Paste introspection JSON
          </Button>
        </div>

        {fallbackMode !== 'none' && (
          <div className="mt-3">
            <textarea
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder={fallbackMode === 'sdl' ? 'type Query { ... }' : '{ "data": { "__schema": { ... } } }'}
              className="h-40 w-full rounded-md border border-slate-300 p-2 font-mono text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <div className="mt-2">
              <Button onClick={handleParseFallback} disabled={!fallbackText.trim()}>
                Parse schema
              </Button>
            </div>
          </div>
        )}
      </Card>

      {schemaErrorMsg && <Badge tone="red">{schemaErrorMsg}</Badge>}

      {schemaModel && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Schema loaded ({Object.keys(schemaModel.types).length} types, {schemaModel.queryFields.length} root queries)
              </p>
              <p className="text-xs text-slate-400">Source: {schemaModel.source}</p>
            </div>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
