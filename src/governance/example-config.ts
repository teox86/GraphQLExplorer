import type { GovernanceConfig } from '../types';

/**
 * Example governance configuration matching the bundled mock schema
 * (`src/config/mock-schema.ts`). Replace with your own config, or load one
 * dynamically, to point the app at a different backend.
 *
 * Nothing here is mandatory: any root query or field without an override
 * simply falls back to schema-derived defaults (technical name as label,
 * "common" visibility, no time-range requirement, etc).
 */
export const EXAMPLE_GOVERNANCE_CONFIG: GovernanceConfig = {
  categories: [
    {
      id: 'kpi',
      label: 'KPIs & Metrics',
      description: 'Calculated performance indicators aggregated over time, optionally by dimension.',
      icon: 'gauge',
      matchRootFieldNames: ['kpiReport', 'compareKpi'],
    },
    {
      id: 'historical',
      label: 'Historical / Raw Data',
      description: 'Detailed, record-level data for a time period - production runs, transactions, logs.',
      icon: 'history',
      matchRootFieldNames: ['productionHistory'],
    },
    {
      id: 'events',
      label: 'Events & RCA',
      description: 'Discrete events such as root-cause-analysis records, alarms, or incidents.',
      icon: 'alert-triangle',
      matchRootFieldNames: ['rcaEvents'],
    },
    {
      id: 'entities',
      label: 'Business Entities',
      description: 'Master data: sites, lines, equipment, products, and other reference entities.',
      icon: 'building',
      matchRootFieldNames: ['site', 'sites', 'equipment', 'equipmentList', 'batch'],
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Predefined report definitions and catalog metadata.',
      icon: 'file-text',
      matchRootFieldNames: ['reportCatalog'],
    },
  ],

  rootQueryOverrides: [
    {
      fieldName: 'kpiReport',
      categoryId: 'kpi',
      friendlyLabel: 'KPI Time-Series Report',
      friendlyDescription:
        'Retrieve one or more KPIs over a time range, optionally broken down by site, line, equipment or another business dimension.',
      tags: ['time-based', 'requires-date-range', 'returns-kpi', 'dimensional', 'returns-list'],
      isTimeBased: true,
      requiresTimeRange: true,
      defaultTimeRangePreset: 'last7d',
      timeRangeMapping: { style: 'nested-input', startPath: 'input.period.from', endPath: 'input.period.to' },
      dimensionKeys: ['site', 'area', 'line', 'equipment', 'kpiFamily', 'kpi'],
      requiredFilterDimensionKeys: ['kpi'],
      groupByArgumentPath: 'input.groupBy',
      timeBucketArgumentPath: 'input.granularity',
      maxSelectableDepth: 5,
      maxSelectedFields: 40,
      recommendedUsage: 'Best for dashboards and trend charts. Always scope by KPI and a reasonable time range.',
    },
    {
      fieldName: 'compareKpi',
      categoryId: 'kpi',
      friendlyLabel: 'KPI Period Comparison',
      friendlyDescription: 'Compare a single KPI between two time periods (e.g. this week vs last week).',
      tags: ['time-based', 'requires-date-range', 'returns-kpi', 'advanced'],
      isTimeBased: true,
      requiresTimeRange: false, // uses two explicit periods (periodA/periodB) instead of a single range - see Step 4 generic arguments
      maxSelectableDepth: 4,
      recommendedUsage: 'Use for week-over-week or month-over-month comparisons of a single KPI.',
    },
    {
      fieldName: 'productionHistory',
      categoryId: 'historical',
      friendlyLabel: 'Production History',
      friendlyDescription: 'Detailed, record-level production data for a time period. Can return large result sets.',
      tags: ['time-based', 'requires-date-range', 'returns-list', 'expensive'],
      isTimeBased: true,
      requiresTimeRange: true,
      defaultTimeRangePreset: 'currentDay',
      timeRangeMapping: { style: 'nested-input', startPath: 'input.period.from', endPath: 'input.period.to' },
      dimensionKeys: ['line', 'equipment'],
      maxSelectableDepth: 4,
      maxSelectedFields: 25,
      recommendedUsage: 'Keep the time range narrow (hours to a few days) - this query is record-level and can be large.',
    },
    {
      fieldName: 'rcaEvents',
      categoryId: 'events',
      friendlyLabel: 'Root Cause Analysis Events',
      friendlyDescription: 'Root-cause-analysis event log for downtime, quality, or safety incidents.',
      tags: ['time-based', 'requires-date-range', 'returns-list'],
      isTimeBased: true,
      requiresTimeRange: true,
      defaultTimeRangePreset: 'last7d',
      timeRangeMapping: { style: 'nested-input', startPath: 'input.period.from', endPath: 'input.period.to' },
      dimensionKeys: ['line'],
      maxSelectableDepth: 4,
      recommendedUsage: 'Filter by severity or line to narrow down large event logs.',
    },
    {
      fieldName: 'batch',
      categoryId: 'entities',
      friendlyLabel: 'Batch Detail',
      friendlyDescription: 'Full detail for a single production batch, including material consumption.',
      tags: ['advanced'],
      isTimeBased: false,
      requiresTimeRange: false,
      maxSelectableDepth: 4,
    },
    {
      fieldName: 'site',
      categoryId: 'entities',
      friendlyLabel: 'Site Detail',
      friendlyDescription: 'A single manufacturing site and its organizational hierarchy.',
      tags: ['returns-list'],
      maxSelectableDepth: 5,
    },
    {
      fieldName: 'sites',
      categoryId: 'entities',
      friendlyLabel: 'Search Sites',
      friendlyDescription: 'Search for manufacturing sites by name.',
      tags: ['returns-list'],
      maxSelectableDepth: 5,
    },
    {
      fieldName: 'equipment',
      categoryId: 'entities',
      friendlyLabel: 'Equipment Detail',
      friendlyDescription: 'A single piece of equipment.',
    },
    {
      fieldName: 'equipmentList',
      categoryId: 'entities',
      friendlyLabel: 'List Equipment',
      friendlyDescription: 'List equipment, optionally scoped to a line.',
      tags: ['returns-list'],
    },
    {
      fieldName: 'reportCatalog',
      categoryId: 'reports',
      friendlyLabel: 'Report Catalog',
      friendlyDescription: 'Browse available predefined report definitions.',
      tags: ['returns-report', 'returns-list'],
    },
  ],

  fieldOverrides: [
    { fieldPath: 'id', visibility: 'technical' },
    { fieldPath: 'serialNumber', visibility: 'advanced' },
    { fieldPath: 'installedAt', visibility: 'advanced' },
    { fieldPath: 'dimensionBreakdown', visibility: 'advanced', expensive: true },
    { fieldPath: 'rootCause', visibility: 'common' },
    { fieldPath: 'correctiveAction', visibility: 'common' },
    { fieldPath: 'materials', visibility: 'advanced', expensive: true },
    { fieldPath: 'endCursor', visibility: 'technical', internalOnly: true },
  ],

  fieldArgumentDefaults: [
    // Any selected field that takes a `lang` argument defaults to English, so the
    // required argument is satisfied automatically. Users can still override it
    // per field in the Field Selection step.
    { argName: 'lang', value: 'en' },
  ],

  dimensions: [
    { key: 'site', label: 'Site', argumentPath: 'input.siteId', parentKey: null, supportsGroupBy: true },
    {
      key: 'area',
      label: 'Area',
      parentKey: 'site',
      description: 'Organizational grouping only - narrows the Line picker below, not sent as a separate filter.',
    },
    { key: 'line', label: 'Line', argumentPath: 'input.lineId', parentKey: 'area', supportsGroupBy: true },
    { key: 'equipment', label: 'Equipment', argumentPath: 'input.equipmentId', parentKey: 'line', supportsGroupBy: true },
    {
      key: 'kpiFamily',
      label: 'KPI Family',
      parentKey: null,
      description: 'High-level grouping of related KPIs (e.g. Availability, Quality, Performance) - narrows the KPI picker below.',
    },
    {
      key: 'kpi',
      label: 'KPI',
      argumentPath: 'input.kpiKeys',
      parentKey: 'kpiFamily',
      description: 'The specific KPI(s) to retrieve.',
      supportsComparison: true,
    },
  ],

  kpiFamilies: [
    { key: 'availability', label: 'Availability', kpiKeys: ['oee', 'uptime', 'downtime_minutes'] },
    { key: 'quality', label: 'Quality', kpiKeys: ['scrap_rate', 'first_pass_yield'] },
    { key: 'performance', label: 'Performance', kpiKeys: ['throughput', 'cycle_time'] },
  ],

  kpis: [
    { key: 'oee', label: 'Overall Equipment Effectiveness', unit: '%', familyKey: 'availability' },
    { key: 'uptime', label: 'Uptime', unit: '%', familyKey: 'availability' },
    { key: 'downtime_minutes', label: 'Downtime', unit: 'min', familyKey: 'availability' },
    { key: 'scrap_rate', label: 'Scrap Rate', unit: '%', familyKey: 'quality' },
    { key: 'first_pass_yield', label: 'First Pass Yield', unit: '%', familyKey: 'quality' },
    { key: 'throughput', label: 'Throughput', unit: 'units/h', familyKey: 'performance' },
    { key: 'cycle_time', label: 'Cycle Time', unit: 's', familyKey: 'performance' },
  ],

  timeBuckets: [
    { key: 'HOUR', label: 'Hourly' },
    { key: 'DAY', label: 'Daily' },
    { key: 'WEEK', label: 'Weekly' },
    { key: 'MONTH', label: 'Monthly' },
  ],

  limits: {
    defaultMaxDepth: 6,
    defaultMaxSelectedFields: 60,
    warnListFieldNesting: 2,
  },
};
