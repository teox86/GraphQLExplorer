import { useState, type ReactNode } from 'react';
import type { FieldSelection, GovernanceConfig, IntrospectionSchemaModel, SchemaField, SchemaTypeRef } from '../../types';
import { getSelectableFields, isLeafField } from '../../schema/schema-utils';
import { getFieldDescription, getFieldFriendlyLabel, getFieldVisibility, isFieldHidden } from '../../governance/resolve';
import { Badge } from '../ui';

const VISIBILITY_ORDER = ['recommended', 'common', 'advanced', 'technical'] as const;
const VISIBILITY_LABEL: Record<(typeof VISIBILITY_ORDER)[number], string> = {
  recommended: 'Recommended',
  common: 'Common',
  advanced: 'Advanced',
  technical: 'Technical / internal',
};

interface FieldTreeProps {
  model: IntrospectionSchemaModel;
  governance: GovernanceConfig;
  parentTypeRef: SchemaTypeRef;
  ancestorPath: string[];
  ancestorTypeNames: string[];
  depth: number;
  maxDepth: number;
  selection: FieldSelection[];
  /** Toggle a single (leaf) field on/off by its full path from the selection root. */
  onToggle: (path: string[]) => void;
  /** Toggle an object node: select it with its default sub-fields, or clear its branch. */
  onToggleObject: (path: string[]) => void;
}

export function FieldTree({ model, governance, parentTypeRef, ancestorPath, ancestorTypeNames, depth, maxDepth, selection, onToggle, onToggleObject }: FieldTreeProps) {
  const fields = getSelectableFields(model, parentTypeRef).filter((f) => !isFieldHidden(governance, [...ancestorPath, f.name].join('.')));

  const grouped = new Map<string, SchemaField[]>();
  for (const field of fields) {
    const vis = getFieldVisibility(governance, [...ancestorPath, field.name].join('.'), field);
    const list = grouped.get(vis) ?? [];
    list.push(field);
    grouped.set(vis, list);
  }

  return (
    <div className="flex flex-col gap-2">
      {VISIBILITY_ORDER.filter((vis) => grouped.has(vis)).map((vis) => (
        <VisibilityGroup
          key={vis}
          label={VISIBILITY_LABEL[vis]}
          defaultOpen={vis === 'recommended' || vis === 'common'}
          fields={grouped.get(vis)!}
        >
          {(field) => (
            <FieldRow
              key={field.name}
              model={model}
              governance={governance}
              field={field}
              ancestorPath={ancestorPath}
              ancestorTypeNames={ancestorTypeNames}
              depth={depth}
              maxDepth={maxDepth}
              selection={selection}
              onToggle={onToggle}
              onToggleObject={onToggleObject}
            />
          )}
        </VisibilityGroup>
      ))}
    </div>
  );
}

function VisibilityGroup({
  label,
  fields,
  defaultOpen,
  children,
}: {
  label: string;
  fields: SchemaField[];
  defaultOpen: boolean;
  children: (field: SchemaField) => ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        {label} ({fields.length})
      </button>
      {open && <div className="flex flex-col gap-0.5 border-l border-slate-100 pl-3">{fields.map((f) => children(f))}</div>}
    </div>
  );
}

function FieldRow({
  model,
  governance,
  field,
  ancestorPath,
  ancestorTypeNames,
  depth,
  maxDepth,
  selection,
  onToggle,
  onToggleObject,
}: {
  model: IntrospectionSchemaModel;
  governance: GovernanceConfig;
  field: SchemaField;
  ancestorPath: string[];
  ancestorTypeNames: string[];
  depth: number;
  maxDepth: number;
  selection: FieldSelection[];
  onToggle: (path: string[]) => void;
  onToggleObject: (path: string[]) => void;
}) {
  const path = [...ancestorPath, field.name];
  const fieldPathStr = path.join('.');
  const label = getFieldFriendlyLabel(governance, fieldPathStr, field);
  const description = getFieldDescription(governance, fieldPathStr, field);
  const leaf = isLeafField(model, field.type);
  const namedType = field.type.name ?? field.type.ofType?.name ?? null;
  const isCircular = Boolean(namedType && ancestorTypeNames.includes(namedType));
  const depthExceeded = depth >= maxDepth;
  const [expanded, setExpanded] = useState(false);
  // `selection` is the sibling list at this depth, so a direct child entry means
  // this field (leaf) is selected, or (object) has selected descendants.
  const childNode = selection.find((n) => n.name === field.name);
  const checked = Boolean(childNode);

  const disabled = !leaf && (isCircular || depthExceeded);

  function handleCheckboxChange() {
    if (leaf) {
      onToggle(path);
    } else {
      // Selecting an object pulls in its default sub-fields; expand so the result is visible.
      onToggleObject(path);
      if (!checked) setExpanded(true);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={handleCheckboxChange}
          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:opacity-40"
        />
        {!leaf && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
            title={disabled ? (isCircular ? 'Circular reference' : 'Max depth reached') : expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        )}
        <span className="text-sm text-slate-800" title={description || undefined}>
          {label}
          {field.isDeprecated && <span className="ml-1 text-slate-400 line-through">deprecated</span>}
        </span>
        <span className="font-mono text-[11px] text-slate-400">{field.name}</span>
        {field.isDeprecated && <Badge tone="amber">deprecated</Badge>}
        {disabled && !leaf && <Badge tone="slate">{isCircular ? 'circular' : 'max depth'}</Badge>}
      </div>
      {!leaf && expanded && !disabled && (
        <div className="ml-5 border-l border-slate-100 pl-3">
          <FieldTree
            model={model}
            governance={governance}
            parentTypeRef={field.type}
            ancestorPath={path}
            ancestorTypeNames={namedType ? [...ancestorTypeNames, namedType] : ancestorTypeNames}
            depth={depth + 1}
            maxDepth={maxDepth}
            selection={childNode?.children ?? []}
            onToggle={onToggle}
            onToggleObject={onToggleObject}
          />
        </div>
      )}
    </div>
  );
}
