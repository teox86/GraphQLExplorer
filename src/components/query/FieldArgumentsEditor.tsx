import type { ArgumentValue, GovernanceConfig, IntrospectionSchemaModel, SchemaField } from '../../types';
import { flattenArguments } from '../../schema/flatten-arguments';
import { resolveEffectiveFieldArguments } from '../../query-builder/field-arguments';
import { getFieldArgumentDefault } from '../../governance/resolve';
import { ArgumentControl } from './ArgumentControl';

interface FieldArgumentsEditorProps {
  model: IntrospectionSchemaModel;
  governance: GovernanceConfig;
  field: SchemaField;
  fieldPath: string[];
  selectionArgs: ArgumentValue[] | undefined;
  onSet: (value: ArgumentValue) => void;
  onRemove: (argPath: string) => void;
}

/**
 * Inline editor for the arguments a *selected field* takes (e.g. a `lang`
 * locale on a localized label). Shows the effective value - the user's entry
 * layered over any governance-declared default - so a satisfied required
 * argument reads as filled even before the user touches it.
 */
export function FieldArgumentsEditor({ model, governance, field, fieldPath, selectionArgs, onSet, onRemove }: FieldArgumentsEditorProps) {
  const flatArgs = flattenArguments(model, field.args);
  const effective = new Map(
    resolveEffectiveFieldArguments(model, governance, field, fieldPath, selectionArgs).map((a) => [a.path, a]),
  );
  const fieldPathStr = fieldPath.join('.');

  return (
    <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Field arguments</p>
      <div className="flex flex-col gap-2">
        {flatArgs.map((fa) => {
          const eff = effective.get(fa.path);
          const hasDefault = getFieldArgumentDefault(governance, fieldPathStr, fa.path) !== undefined;
          const missingRequired = Boolean(eff?.isRequired) && !eff?.hasValue;
          return (
            <div key={fa.path}>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                {fa.path}
                {fa.arg.isRequired && <span className="text-red-500">*</span>}
                {hasDefault && <span className="text-[10px] font-normal text-slate-400">(default from governance)</span>}
              </label>
              {fa.arg.description && <p className="mb-0.5 text-[11px] text-slate-400">{fa.arg.description}</p>}
              <ArgumentControl
                model={model}
                flatArg={fa}
                value={eff?.value}
                onChange={(v) => {
                  if (v === undefined || v === null || v === '') {
                    onRemove(fa.path);
                  } else {
                    onSet({ argName: fa.arg.name, path: fa.path, kind: 'unknown', value: v });
                  }
                }}
              />
              {missingRequired && <p className="mt-0.5 text-[11px] text-red-600">This argument is required.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
