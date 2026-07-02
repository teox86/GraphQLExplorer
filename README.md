# GraphQL Explorer - Guided Query Builder

A React + TypeScript application that connects to a GraphQL endpoint and helps
non-technical and advanced users alike build valid, safe GraphQL queries
through a guided, step-by-step wizard - without ever having to read the raw
schema.

The tool is designed for large, deeply-nested enterprise GraphQL APIs
(business entities, time-series KPIs/reports, historical/RCA data,
dimensional filters) where exposing the schema as-is would overwhelm most
users and where ungoverned exploration could produce extremely expensive
queries.

## Stack

- **React 19 + TypeScript + Vite** - fast dev loop, strict typing throughout.
- **Tailwind CSS v4** - utility-first styling, no component library dependency.
- **graphql-request** - minimal GraphQL client for introspection and execution.
- **graphql-js** (`graphql` package) - used for SDL parsing, `print`/`parse`
  based pretty-printing, and turning a hand-written SDL fallback into a
  standard introspection response so both code paths share one parser.

No global state library beyond React's built-in `useReducer` + Context - the
wizard state is entirely local to the app and small enough not to need Redux
/ Zustand.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL. On Step 1 you can either:

1. **Load the example schema** - a bundled mock manufacturing/KPI schema
   (`src/config/mock-schema.ts`) that works fully offline, with zero
   configuration. This is the fastest way to explore the whole wizard.
2. **Connect to a real endpoint** - enter a URL, optionally add headers
   (e.g. `Authorization: Bearer <token>`), then click **Test connection**
   and **Introspect schema**.
3. **Paste a schema manually** - if introspection is disabled on the server,
   paste raw SDL or a previously-exported introspection JSON document.

```bash
npm run build   # type-checks (tsc -b) then builds with Vite
npm run preview # serve the production build locally
```

## Configuring the endpoint

Connection details (endpoint URL + headers) are entered directly in Step 1
of the wizard and persisted to `localStorage` (`src/storage/connection-store.ts`)
so they survive a page reload. There is no build-time endpoint
configuration - this is intentionally a runtime setting so the same build
can point at different environments (dev/staging/prod APIs).

Auth headers are sent as plain HTTP headers on every request
(`src/graphql/client.ts`). For a production, multi-user deployment you would
typically replace this with a proper auth flow (OAuth, session cookie, a
backend proxy that injects the real token) rather than storing raw tokens in
browser storage - see **Limitations** below.

## Configuring governance metadata

The whole point of this tool is that the *raw* schema is never the thing
users see. A separate **governance configuration**
(`src/governance/example-config.ts`, typed by `src/types/governance.ts`)
layers business-friendly metadata on top of whatever the introspected schema
says:

```ts
export const EXAMPLE_GOVERNANCE_CONFIG: GovernanceConfig = {
  categories: [...],          // Step 2 "data intent" buckets
  rootQueryOverrides: [...],  // per-root-query labels, tags, time-range mapping, limits
  fieldOverrides: [...],      // hide/relabel/reclassify individual fields by path
  dimensions: [...],          // business dimensions (Site > Area > Line > Equipment, KPI, ...)
  kpiFamilies: [...],
  kpis: [...],
  timeBuckets: [...],
  limits: { defaultMaxDepth, defaultMaxSelectedFields, warnListFieldNesting },
};
```

Nothing in this file is mandatory - every lookup in
`src/governance/resolve.ts` falls back to a schema-derived default (the
technical field name, "common" visibility, no time-range requirement, etc.)
when no override is present. This means the app is usable against a brand
new, completely unconfigured schema on day one, and gets progressively more
guided as an administrator adds governance entries.

To point the app at a different schema/domain: write your own
`GovernanceConfig` object (see the example for the shape) and pass it to
`setGovernance()` from `useWizard()` - the wizard's `governance` field in
`WizardState` is designed to be swappable at runtime (e.g. loaded from a
config file, a feature flag, or a backend endpoint) rather than hardcoded.

Key governance concepts, all optional per root query:

- `isTimeBased` / `requiresTimeRange` / `defaultTimeRangePreset` /
  `timeRangeMapping` - drives the prominent time-range picker in Step 4 and
  maps the resolved start/end values onto whatever argument shape the API
  actually uses (`from`/`to`, `startDate`/`endDate`, a nested
  `input.period.from` input object, etc.) via a dotted path.
- `dimensionKeys` / `requiredFilterDimensionKeys` - which business
  dimensions (from the top-level `dimensions` array) apply to this query,
  and which are strongly recommended before running it.
- `groupByArgumentPath` / `timeBucketArgumentPath` - generic mapping points
  for grouping and time-bucket/granularity arguments, so nothing about
  "group by" or "hourly/daily/weekly" is hardcoded into the query builder.
- `maxSelectableDepth` / `maxSelectedFields` - per-query overrides of the
  global safety limits, e.g. a known-expensive "raw history" query can have
  a tighter cap than a lightweight lookup.

Field-level overrides (`fieldOverrides`) key off a **dotted path relative to
the query result** (e.g. `"materials"`, `"line.equipment.serialNumber"`) and
can hide a field, mark it internal-only, relabel/redescribe it, or bucket it
into `recommended` / `common` / `advanced` / `technical` visibility for the
Step 6 field tree.

## Example flow: a time-based KPI report

This walks through building the example "KPI Time-Series Report"
(`kpiReport`) query end-to-end against the bundled mock schema:

1. **Step 1** - click **Load example schema**.
2. **Step 2** - choose **KPIs & Metrics**.
3. **Step 3** - choose **KPI Time-Series Report** (tagged `time-based`,
   `requires-date-range`, `dimensional`).
4. **Step 4** - the time range picker is shown prominently because this
   query is governed as time-based; pick **Last 7 days** (or a custom
   range). No other generic arguments are required.
5. **Step 5** - the KPI dimension is marked as a required filter, so select
   at least one KPI (e.g. **Overall Equipment Effectiveness**); optionally
   narrow by KPI Family first, filter by Site/Line/Equipment, group by Line,
   and pick a **Daily** time bucket.
6. **Step 6** - click **Select minimal useful result** to auto-pick a
   sensible default field set, or expand the tree and hand-pick fields;
   Common/Advanced/Technical groups keep the noisy fields collapsed by
   default.
7. **Step 7** - review the generated query and variables (nested exactly
   into `{ input: { period: { from, to }, kpiKeys: [...] } }` per the
   governance mapping), copy the query, variables, or an equivalent `curl`
   command.
8. **Step 8** - run it against a real endpoint (the bundled mock schema has
   no live resolver, so execution against it will fail with a network
   error - this step is meant to be used once you've connected to a real
   API) and inspect the JSON/table/chart views.
9. **Step 9** - save the configuration as a named template for later reuse.

## Architecture

```
src/
  types/            Central TypeScript interfaces (schema, query, governance, complexity, templates)
  graphql/           GraphQL client, introspection fetch, curl builder, error-message mapping
  schema/            Introspection + SDL parsers, internal schema model, schema-walking utilities
  governance/         Governance config type resolution (labels, categories, visibility, dimensions)
  query-builder/      Turns a QueryConfiguration into a GraphQL document + variables
  complexity/         Heuristic client-side complexity/safety estimator
  storage/            localStorage-backed template + connection persistence (behind small interfaces)
  app/                Wizard state (useReducer + Context), selection-tree helpers, presets, search
  components/
    layout/           App shell, left-hand wizard nav, right-hand contextual summary panel
    wizard/            One component per wizard step (Step 1 through Step 9)
    schema/            Recursive field-tree UI
    query/             Argument controls, time-range picker
    results/           JSON/table/chart result views, CSV export
  config/             Bundled mock schema (SDL) used for local testing without a live endpoint
```

Each layer only depends on the ones below it in this list (UI depends on
query-builder/complexity/governance, which depend on schema/types, etc.),
so, for example, the complexity estimator can be swapped for a real backend
scoring endpoint later without touching the UI - it already returns the same
`ComplexityReport` shape via `estimateComplexity()`
(`src/complexity/estimate.ts`), the natural place to add that swap.

### Data flow in one sentence

`GraphQLConnectionConfig` → (introspection or SDL/JSON fallback) →
`IntrospectionSchemaModel` → wizard state (`QueryConfiguration`, layered with
`GovernanceConfig`) → `generateQuery()` produces a `GeneratedQuery`
(document text + variables) → `executeGraphQLQuery()` runs it → result
rendered as JSON/table/chart.

## Limitations

This is a first, extensible version, not a finished enterprise product.
Known gaps, most with a clear extension point already in the code:

- **No live entity pickers.** Hierarchical dimension filters (Site, Line,
  Equipment, ...) are plain ID text inputs, not dropdowns populated by a
  live query against the API. `DimensionConfig` already models everything
  needed to wire this up (`argumentPath`, hierarchy via `parentKey`); the
  missing piece is a small data-fetching layer per dimension.
- **No inline fragments / unions.** `getSelectableFields` (schema/schema-utils.ts)
  returns an empty field list for `UNION` types - interfaces resolve their
  own fields but polymorphic sub-typing isn't supported in the field tree yet.
- **No field aliases in the builder UI**, even though `FieldSelection.alias`
  and the query printer already support them - only needed for advanced
  duplicate-field-with-different-args scenarios, out of scope for v1.
  Operation name is user-editable in state but not yet exposed as a Step 4/7
  input field.
- **Advanced filter operators** (greater-than, contains, not-equal, etc.) are
  modeled in `DimensionFilterValue.operator` but the Step 5 UI currently only
  emits `eq`/`in`. The "Advanced filters" panel is a placeholder explaining
  this rather than a full condition builder.
- **Complexity estimation is purely heuristic** (field count / depth / list
  count / missing filters), computed entirely client-side. It is not a real
  cost-weighted GraphQL complexity analysis. `estimateComplexity()` is
  isolated specifically so it can be replaced by a call to a backend
  complexity-scoring endpoint without changing any caller.
- **Templates are local-only** (`localStorage`, `src/storage/template-store.ts`).
  The `TemplateStore` interface is deliberately small so a backend-backed
  implementation can be swapped in later.
- **Auth headers are stored in plaintext in `localStorage`** for developer
  convenience. Do not reuse this pattern for a shared/multi-user deployment
  without a real auth layer.
- **No automated test suite yet.** The app has been manually smoke-tested
  end-to-end (schema load → category → query → args → time range →
  dimensions/filters → fields → preview → execute → templates) against the
  bundled mock schema; unit tests for `query-builder/` and `complexity/`
  would be the highest-value first addition.

## Future enhancements

Roughly in priority order, building on the extension points above:

1. Live entity pickers for dimension filters (query the API for
   sites/lines/equipment/etc. instead of free-text IDs).
2. Backend-driven complexity scoring, replacing/augmenting the heuristic.
3. A real advanced-filter condition builder (operators, AND/OR grouping).
4. Backend-backed templates with sharing/role-based visibility.
5. Role-based governance (different `GovernanceConfig` per user role, driving
   which categories/root queries/fields are visible - the config shape
   already supports per-field `internalOnly` / `externallyExposable` flags
   for this).
6. Inline fragment support for unions/interfaces in the field tree.
7. Query aliasing UI for selecting the same field twice with different
   arguments (e.g. two KPI comparisons side by side).
