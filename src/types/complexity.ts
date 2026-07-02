export type WarningSeverity = 'soft' | 'hard';

export interface ComplexityWarning {
  code: string;
  severity: WarningSeverity;
  message: string;
}

export interface ComplexityReport {
  selectedFieldCount: number;
  maxDepth: number;
  listFieldCount: number;
  hasTimeRange: boolean;
  missingRequiredFilters: string[];
  warnings: ComplexityWarning[];
  /** True when at least one hard warning is present - execution should be blocked unless overridden is impossible for hard rules. */
  blocksExecution: boolean;
}
