import { useState } from 'react';
import type { FlatArgument } from '../../schema/flatten-arguments';
import { inferArgumentControl } from '../../schema/argument-control';
import type { IntrospectionSchemaModel } from '../../types';
import { typeRefToString } from '../../types';
import { TextInput } from '../ui';

interface ArgumentControlProps {
  model: IntrospectionSchemaModel;
  flatArg: FlatArgument;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function ArgumentControl({ model, flatArg, value, onChange }: ArgumentControlProps) {
  const { arg } = flatArg;
  const control = inferArgumentControl(model, arg.type);
  const [jsonDraft, setJsonDraft] = useState(() => (value !== undefined ? JSON.stringify(value, null, 2) : ''));
  const [jsonError, setJsonError] = useState<string | null>(null);

  switch (control.kind) {
    case 'boolean':
      return (
        <select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Not set</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );

    case 'number':
      return (
        <TextInput
          type="number"
          value={value !== undefined && value !== null ? String(value) : ''}
          onChange={(v) => onChange(v === '' ? undefined : Number(v))}
        />
      );

    case 'enum':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Not set</option>
          {control.enumValues?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );

    case 'multi-select': {
      const selected = new Set<string>(Array.isArray(value) ? (value as string[]) : []);
      if (control.enumValues) {
        return (
          <div className="flex flex-wrap gap-2">
            {control.enumValues.map((v) => {
              const active = selected.has(v);
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() => {
                    const next = new Set(selected);
                    if (active) next.delete(v);
                    else next.add(v);
                    onChange(Array.from(next));
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                    active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        );
      }
      return (
        <TextInput
          value={Array.isArray(value) ? (value as string[]).join(', ') : ''}
          onChange={(v) =>
            onChange(
              v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="Comma-separated values"
        />
      );
    }

    case 'datetime':
      return (
        <TextInput
          type="datetime-local"
          value={typeof value === 'string' ? value.slice(0, 16) : ''}
          onChange={(v) => onChange(v ? new Date(v).toISOString() : undefined)}
        />
      );

    case 'json':
      return (
        <div>
          <textarea
            value={jsonDraft}
            onChange={(e) => {
              setJsonDraft(e.target.value);
              try {
                onChange(e.target.value.trim() ? JSON.parse(e.target.value) : undefined);
                setJsonError(null);
              } catch {
                setJsonError('Invalid JSON');
              }
            }}
            placeholder={`JSON value for ${typeRefToString(arg.type)}`}
            className="h-24 w-full rounded-md border border-slate-300 p-2 font-mono text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {jsonError && <p className="mt-1 text-xs text-red-600">{jsonError}</p>}
        </div>
      );

    case 'string':
    default:
      return <TextInput value={typeof value === 'string' ? value : ''} onChange={onChange} />;
  }
}
