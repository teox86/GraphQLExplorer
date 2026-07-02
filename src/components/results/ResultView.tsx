import { useMemo, useState } from 'react';
import { Button, EmptyState } from '../ui';
import { findFirstArrayOfObjects, guessChartColumns, rowsToTable } from '../../results/flatten';
import { downloadTextFile, rowsToCsv } from '../../results/csv';
import { ResultTable } from './ResultTable';
import { ResultChart } from './ResultChart';

type ResultTab = 'json' | 'table' | 'chart';

export function ResultView({ data }: { data: unknown }) {
  const [tab, setTab] = useState<ResultTab>('json');

  const tableData = useMemo(() => {
    const found = findFirstArrayOfObjects(data);
    if (!found) return null;
    return { path: found.path, ...rowsToTable(found.rows) };
  }, [data]);

  const chartColumns = useMemo(() => (tableData ? guessChartColumns(tableData.columns) : { labelColumn: null, valueColumn: null }), [tableData]);

  const jsonText = JSON.stringify(data, null, 2);

  function exportJson() {
    downloadTextFile('query-result.json', jsonText, 'application/json');
  }

  function exportCsv() {
    if (!tableData) return;
    downloadTextFile('query-result.csv', rowsToCsv(tableData.columns, tableData.rows), 'text/csv');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {(['json', 'table', 'chart'] as ResultTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportJson}>
            Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!tableData}>
            Export CSV
          </Button>
        </div>
      </div>

      {tab === 'json' && (
        <pre className="max-h-96 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
          <code>{jsonText}</code>
        </pre>
      )}

      {tab === 'table' &&
        (tableData ? (
          <>
            <p className="text-xs text-slate-400">
              Showing list found at <span className="font-mono">{tableData.path.join('.') || '(root)'}</span>
            </p>
            <ResultTable columns={tableData.columns} rows={tableData.rows} />
          </>
        ) : (
          <EmptyState title="No tabular data found" description="The result does not contain a list of records to display as a table." />
        ))}

      {tab === 'chart' &&
        (tableData && chartColumns.labelColumn && chartColumns.valueColumn ? (
          <ResultChart rows={tableData.rows} labelColumn={chartColumns.labelColumn} valueColumn={chartColumns.valueColumn} />
        ) : (
          <EmptyState
            title="No chartable data found"
            description="Charting needs a list with a label-like field (e.g. timestamp, name) and a numeric field (e.g. value, count)."
          />
        ))}
    </div>
  );
}
