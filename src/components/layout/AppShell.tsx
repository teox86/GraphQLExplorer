import type { ReactNode } from 'react';
import { WizardNav } from './WizardNav';
import { SummaryPanel } from './SummaryPanel';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col bg-slate-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">GQ</div>
          <span className="text-sm font-semibold text-slate-900">GraphQL Explorer</span>
          <span className="text-xs text-slate-400">Guided Query Builder</span>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr_280px] xl:grid-cols-[260px_1fr_320px]">
        <div className="min-h-0 border-r border-slate-200 bg-white">
          <WizardNav />
        </div>
        <main className="min-h-0 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
        <div className="min-h-0 border-l border-slate-200 bg-white">
          <SummaryPanel />
        </div>
      </div>
    </div>
  );
}
