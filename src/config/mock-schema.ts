/**
 * Example SDL for a manufacturing/business "digital plant" GraphQL API.
 *
 * This is used as the bundled mock schema so the app is fully explorable
 * without a live backend, and it doubles as the reference schema for the
 * example governance configuration in `governance/example-config.ts`.
 */
export const MOCK_SCHEMA_SDL = /* GraphQL */ `
"""Root query type."""
type Query {
  """A single manufacturing site."""
  site(id: ID!): Site

  """Search across manufacturing sites."""
  sites(nameContains: String): [Site!]!

  """A single piece of equipment by id."""
  equipment(id: ID!): Equipment

  """List equipment, optionally scoped to a production line."""
  equipmentList(lineId: ID): [Equipment!]!

  """
  Time-series KPI report. Supports filtering by site/line/equipment,
  grouping by business dimensions, and choosing an aggregation granularity.
  """
  kpiReport(input: KpiReportInput!): KpiReportResult!

  """Raw historical production records for a time period."""
  productionHistory(input: ProductionHistoryInput!): ProductionHistoryResult!

  """Root-cause-analysis event log for a time period."""
  rcaEvents(input: RcaEventsInput!): RcaEventConnection!

  """Full detail for a single production batch."""
  batch(id: ID!): Batch

  """Compare a single KPI across two time periods."""
  compareKpi(input: CompareKpiInput!): KpiComparisonResult!

  """Catalog of available report definitions (metadata, not time-based)."""
  reportCatalog: [ReportDefinition!]!
}

"""A manufacturing site (plant)."""
type Site {
  id: ID!
  name: String!
  country: String
  areas: [Area!]!
}

"""A functional area within a site (e.g. Packaging, Assembly)."""
type Area {
  id: ID!
  name: String!
  site: Site!
  lines: [Line!]!
}

"""A production line."""
type Line {
  id: ID!
  name: String!
  area: Area!
  equipment: [Equipment!]!
}

"""A machine or piece of equipment on a line."""
type Equipment {
  id: ID!
  name: String!
  type: String
  line: Line!
  serialNumber: String
  installedAt: DateTime
}

"""A finished or intermediate product."""
type Product {
  id: ID!
  code: String!
  name: String!
  family: String
}

"""A raw or intermediate material."""
type Material {
  id: ID!
  code: String!
  name: String!
}

enum TimeBucket {
  HOUR
  DAY
  WEEK
  MONTH
}

enum RcaSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

"""Start/end bounds for any time-based query."""
input DateRangeInput {
  from: DateTime!
  to: DateTime!
}

input KpiReportInput {
  period: DateRangeInput!
  siteId: ID
  lineId: ID
  equipmentId: ID
  kpiKeys: [String!]!
  granularity: TimeBucket = DAY
  groupBy: [String!]
}

type KpiPoint {
  timestamp: DateTime!
  value: Float
  dimensionBreakdown: [DimensionValue!]
}

type DimensionValue {
  key: String!
  label: String!
  value: Float!
}

type KpiSummary {
  average: Float
  min: Float
  max: Float
  total: Float
}

type KpiSeries {
  kpiKey: String!
  kpiLabel: String!
  unit: String
  points: [KpiPoint!]!
  summary: KpiSummary
}

type DateRange {
  from: DateTime!
  to: DateTime!
}

type KpiReportResult {
  series: [KpiSeries!]!
  requestedPeriod: DateRange!
}

input ProductionHistoryInput {
  period: DateRangeInput!
  lineId: ID
  equipmentId: ID
}

type ProductionRecord {
  id: ID!
  timestamp: DateTime!
  product: Product
  quantityProduced: Float
  quantityScrapped: Float
  line: Line
  equipment: Equipment
}

type ProductionHistoryResult {
  records: [ProductionRecord!]!
  totalCount: Int!
}

input RcaEventsInput {
  period: DateRangeInput!
  lineId: ID
  severity: RcaSeverity
  category: String
}

type RcaEvent {
  id: ID!
  timestamp: DateTime!
  title: String!
  description: String
  severity: RcaSeverity!
  durationMinutes: Int
  line: Line
  equipment: Equipment
  rootCause: String
  correctiveAction: String
}

type RcaEventEdge {
  node: RcaEvent!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type RcaEventConnection {
  edges: [RcaEventEdge!]!
  pageInfo: PageInfo!
}

type MaterialConsumption {
  material: Material!
  quantity: Float!
  unit: String!
}

enum QualityStatus {
  PASSED
  FAILED
  PENDING
}

type Batch {
  id: ID!
  code: String!
  product: Product!
  startTime: DateTime!
  endTime: DateTime
  quantity: Float!
  qualityStatus: QualityStatus!
  materials: [MaterialConsumption!]!
}

input CompareKpiInput {
  kpiKey: String!
  periodA: DateRangeInput!
  periodB: DateRangeInput!
  dimensionKeys: [String!]
}

type KpiComparisonResult {
  kpiKey: String!
  periodA: KpiSummary!
  periodB: KpiSummary!
  deltaPercent: Float
}

type ReportDefinition {
  key: String!
  label: String!
  description: String
  category: String
}

"""ISO-8601 date-time scalar."""
scalar DateTime
`;
