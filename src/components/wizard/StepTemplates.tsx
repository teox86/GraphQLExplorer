import { useMemo, useState } from 'react';
import { useWizard } from '../../app/wizard-context';
import { Badge, Button, Card, EmptyState, SectionHeading, TextInput } from '../ui';
import { localTemplateStore } from '../../storage/template-store';
import { generateQuery } from '../../query-builder';
import type { SavedTemplate } from '../../types';

export function StepTemplates() {
  const { state, loadTemplate, setStep } = useWizard();
  const { schemaModel, governance, config, connection } = state;
  const [name, setName] = useState('');
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => localTemplateStore.list());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const generated = useMemo(() => (schemaModel ? generateQuery(config, schemaModel, governance) : null), [config, schemaModel, governance]);

  function refresh() {
    setTemplates(localTemplateStore.list());
  }

  function handleSave() {
    if (!name.trim() || !generated?.success || !generated.query) return;
    localTemplateStore.save({
      name: name.trim(),
      endpointUrl: connection.endpointUrl,
      configuration: config,
      generatedQueryText: generated.query.documentText,
      variables: generated.query.variables,
    });
    setName('');
    refresh();
  }

  function handleLoad(template: SavedTemplate) {
    loadTemplate(template.configuration);
    setStep(7);
  }

  function handleDelete(id: string) {
    localTemplateStore.remove(id);
    refresh();
  }

  function commitRename(id: string) {
    if (renameValue.trim()) localTemplateStore.rename(id, renameValue.trim());
    setRenamingId(null);
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Save & reuse query templates"
        description="Templates are stored locally in your browser. This is designed so a backend template API can be swapped in later without changing the wizard."
      />

      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Save current configuration</p>
        <div className="flex gap-2">
          <TextInput value={name} onChange={setName} placeholder="Template name, e.g. 'Weekly OEE by line'" />
          <Button onClick={handleSave} disabled={!name.trim() || !generated?.success}>
            Save template
          </Button>
        </div>
        {!generated?.success && <p className="mt-2 text-xs text-red-600">Complete the wizard (root query + fields) before saving.</p>}
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Saved templates ({templates.length})</p>
        {templates.length === 0 && <EmptyState title="No saved templates yet" description="Templates you save will appear here." />}
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renamingId === t.id ? (
                    <div className="flex gap-2">
                      <TextInput value={renameValue} onChange={setRenameValue} />
                      <Button size="sm" onClick={() => commitRename(t.id)}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {t.configuration.rootFieldName} · {new Date(t.updatedAt).toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Badge tone="slate">{t.endpointUrl ? new URL(t.endpointUrl, 'http://x').host : 'unknown'}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => handleLoad(t)}>
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenamingId(t.id);
                      setRenameValue(t.name);
                    }}
                  >
                    Rename
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
