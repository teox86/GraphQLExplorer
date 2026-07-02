import { useMemo, useState } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Button, Card, EmptyState, SectionHeading, TextInput, WarningBanner } from '../ui';
import { findRootQueryField } from '../../schema/schema-utils';
import { getMaxDepth, getMaxSelectedFields } from '../../governance/resolve';
import { FieldTree } from '../schema/FieldTree';
import { buildAllVisibleSelection, buildMinimalSelection } from '../../app/selection-presets';
import { searchFields } from '../../app/field-search';
import { isPathSelected } from '../../app/selection-tree';
import { estimateComplexity } from '../../complexity/estimate';

export function StepFields() {
  const { state, toggleField, setSelection, setStep } = useWizard();
  const { schemaModel, governance, config } = state;
  const [search, setSearch] = useState('');

  const rootField = schemaModel && config.rootFieldName ? findRootQueryField(schemaModel, config.rootFieldName) : null;
  const maxDepth = config.rootFieldName ? getMaxDepth(governance, config.rootFieldName) : governance.limits.defaultMaxDepth;
  const maxFields = config.rootFieldName ? getMaxSelectedFields(governance, config.rootFieldName) : governance.limits.defaultMaxSelectedFields;

  const complexity = useMemo(() => estimateComplexity(config, schemaModel, governance), [config, schemaModel, governance]);

  const searchResults = useMemo(() => {
    if (!schemaModel || !rootField || !search.trim()) return null;
    return searchFields(schemaModel, governance, rootField.type, search.trim(), maxDepth);
  }, [schemaModel, rootField, governance, search, maxDepth]);

  if (!schemaModel || !rootField) {
    return <EmptyState title="No query selected" description="Go back and choose a root query first." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Select fields to return"
        description="Choose which fields to include in the result. Recommended and common fields are grouped separately from advanced/technical ones."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSelection(buildMinimalSelection(schemaModel, governance, rootField.type))}
        >
          Select minimal useful result
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSelection(buildAllVisibleSelection(schemaModel, governance, rootField.type, maxDepth, maxFields))}
        >
          Select all visible fields (within limits)
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSelection([])}>
          Clear selection
        </Button>
        <div className="ml-auto">
          <Badge tone={complexity.selectedFieldCount > maxFields ? 'red' : 'slate'}>
            {complexity.selectedFieldCount} / {maxFields} fields · depth {complexity.maxDepth} / {maxDepth}
          </Badge>
        </div>
      </div>

      <TextInput value={search} onChange={setSearch} placeholder="Search fields by name or description…" />

      <Card className="max-h-[28rem] overflow-y-auto p-4">
        {searchResults ? (
          <div className="flex flex-col gap-1">
            {searchResults.length === 0 && <EmptyState title="No fields match your search" />}
            {searchResults.map((match) => (
              <label key={match.path.join('.')} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={isPathSelected(config.selection, match.path)}
                  onChange={() => toggleField(match.path)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <span className="text-sm text-slate-800">{match.label}</span>
                <span className="font-mono text-[11px] text-slate-400">{match.path.join('.')}</span>
                {match.deprecated && <Badge tone="amber">deprecated</Badge>}
              </label>
            ))}
          </div>
        ) : (
          <FieldTree
            model={schemaModel}
            governance={governance}
            parentTypeRef={rootField.type}
            ancestorPath={[]}
            ancestorTypeNames={[]}
            depth={0}
            maxDepth={maxDepth}
            selection={config.selection}
            onToggle={toggleField}
          />
        )}
      </Card>

      {complexity.warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {complexity.warnings
            .filter((w) => w.code === 'MAX_DEPTH_EXCEEDED' || w.code === 'MAX_FIELDS_EXCEEDED' || w.code === 'DEEP_LIST_NESTING' || w.code === 'NO_FIELDS_SELECTED')
            .map((w) => (
              <WarningBanner key={w.code} severity={w.severity}>
                {w.message}
              </WarningBanner>
            ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setStep(7)}>Continue to preview</Button>
      </div>
    </div>
  );
}
