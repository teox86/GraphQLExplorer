import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type {
  ArgumentValue,
  DimensionFilterValue,
  FieldSelection,
  GovernanceConfig,
  GraphQLConnectionConfig,
  IntrospectionSchemaModel,
  QueryConfiguration,
  SchemaLoadStrategy,
  TimeRangeConfig,
} from '../types';
import type { ExecuteQueryResult } from '../graphql/client';
import { EXAMPLE_GOVERNANCE_CONFIG } from '../governance/example-config';
import { createEmptyQueryConfiguration } from './default-state';
import { getRootQueryOverride } from '../governance/resolve';
import { buildObjectDefaultBranch, isPathSelected, pruneEmptySelection, setSelectionBranch, toggleSelectionPath, updateFieldArgument } from './selection-tree';
import { findRootQueryField } from '../schema/schema-utils';

export interface WizardState {
  step: number;
  connection: GraphQLConnectionConfig;
  schemaModel: IntrospectionSchemaModel | null;
  schemaSource: SchemaLoadStrategy | null;
  schemaError: string | null;
  schemaLoading: boolean;
  governance: GovernanceConfig;
  config: QueryConfiguration;
  execution: { loading: boolean; result: ExecuteQueryResult | null };
}

type Action =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_CONNECTION'; connection: GraphQLConnectionConfig }
  | { type: 'SCHEMA_LOADING' }
  | { type: 'SCHEMA_LOADED'; model: IntrospectionSchemaModel; source: SchemaLoadStrategy }
  | { type: 'SCHEMA_ERROR'; error: string }
  | { type: 'SET_GOVERNANCE'; governance: GovernanceConfig }
  | { type: 'SET_INTENT_CATEGORY'; categoryId: string | null }
  | { type: 'SET_ROOT_FIELD'; fieldName: string }
  | { type: 'SET_OPERATION_NAME'; name: string }
  | { type: 'SET_ARGUMENT_VALUE'; value: ArgumentValue }
  | { type: 'REMOVE_ARGUMENT_VALUE'; path: string }
  | { type: 'SET_TIME_RANGE'; timeRange: TimeRangeConfig | null }
  | { type: 'ADD_DIMENSION_FILTER'; filter: DimensionFilterValue }
  | { type: 'REMOVE_DIMENSION_FILTER'; dimensionKey: string }
  | { type: 'SET_GROUP_BY'; keys: string[] }
  | { type: 'SET_TIME_BUCKET'; bucket: string | null }
  | { type: 'TOGGLE_FIELD'; path: string[] }
  | { type: 'TOGGLE_OBJECT_DEFAULTS'; path: string[] }
  | { type: 'SET_FIELD_ARGUMENT'; path: string[]; value: ArgumentValue }
  | { type: 'REMOVE_FIELD_ARGUMENT'; path: string[]; argPath: string }
  | { type: 'SET_SELECTION'; selection: FieldSelection[] }
  | { type: 'SET_OVERRIDE_WARNINGS'; value: boolean }
  | { type: 'EXECUTION_START' }
  | { type: 'EXECUTION_DONE'; result: ExecuteQueryResult }
  | { type: 'LOAD_TEMPLATE'; configuration: QueryConfiguration };

function initialState(): WizardState {
  return {
    step: 1,
    connection: { endpointUrl: '', headers: [{ key: 'Authorization', value: '' }] },
    schemaModel: null,
    schemaSource: null,
    schemaError: null,
    schemaLoading: false,
    governance: EXAMPLE_GOVERNANCE_CONFIG,
    config: createEmptyQueryConfiguration(),
    execution: { loading: false, result: null },
  };
}

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'SET_CONNECTION':
      return { ...state, connection: action.connection };

    case 'SCHEMA_LOADING':
      return { ...state, schemaLoading: true, schemaError: null };

    case 'SCHEMA_LOADED':
      return {
        ...state,
        schemaLoading: false,
        schemaError: null,
        schemaModel: action.model,
        schemaSource: action.source,
      };

    case 'SCHEMA_ERROR':
      return { ...state, schemaLoading: false, schemaError: action.error };

    case 'SET_GOVERNANCE':
      return { ...state, governance: action.governance };

    case 'SET_INTENT_CATEGORY':
      return { ...state, config: { ...state.config, intentCategoryId: action.categoryId, rootFieldName: null } };

    case 'SET_ROOT_FIELD': {
      const override = getRootQueryOverride(state.governance, action.fieldName);
      const isTimeBased = override?.isTimeBased ?? false;
      const timeRange: TimeRangeConfig | null =
        isTimeBased && override?.timeRangeMapping
          ? {
              preset: override.defaultTimeRangePreset ?? 'last7d',
              start: null,
              end: null,
              mapping: override.timeRangeMapping,
            }
          : null;

      return {
        ...state,
        config: {
          ...createEmptyQueryConfiguration(),
          intentCategoryId: state.config.intentCategoryId,
          rootFieldName: action.fieldName,
          operationName: `${action.fieldName.charAt(0).toUpperCase()}${action.fieldName.slice(1)}Query`,
          timeRange,
        },
      };
    }

    case 'SET_OPERATION_NAME':
      return { ...state, config: { ...state.config, operationName: action.name } };

    case 'SET_ARGUMENT_VALUE': {
      const others = state.config.arguments.filter((a) => a.path !== action.value.path);
      return { ...state, config: { ...state.config, arguments: [...others, action.value] } };
    }

    case 'REMOVE_ARGUMENT_VALUE':
      return {
        ...state,
        config: { ...state.config, arguments: state.config.arguments.filter((a) => a.path !== action.path) },
      };

    case 'SET_TIME_RANGE':
      return { ...state, config: { ...state.config, timeRange: action.timeRange } };

    case 'ADD_DIMENSION_FILTER': {
      const others = state.config.dimensionFilters.filter((f) => f.dimensionKey !== action.filter.dimensionKey);
      return { ...state, config: { ...state.config, dimensionFilters: [...others, action.filter] } };
    }

    case 'REMOVE_DIMENSION_FILTER':
      return {
        ...state,
        config: {
          ...state.config,
          dimensionFilters: state.config.dimensionFilters.filter((f) => f.dimensionKey !== action.dimensionKey),
        },
      };

    case 'SET_GROUP_BY':
      return { ...state, config: { ...state.config, groupByDimensionKeys: action.keys } };

    case 'SET_TIME_BUCKET':
      return { ...state, config: { ...state.config, timeBucket: action.bucket } };

    case 'TOGGLE_FIELD': {
      const toggled = toggleSelectionPath(state.config.selection, action.path);
      const rootField =
        state.schemaModel && state.config.rootFieldName
          ? findRootQueryField(state.schemaModel, state.config.rootFieldName)
          : null;
      const pruned =
        state.schemaModel && rootField ? pruneEmptySelection(state.schemaModel, rootField.type, toggled) : toggled;
      return { ...state, config: { ...state.config, selection: pruned } };
    }

    case 'TOGGLE_OBJECT_DEFAULTS': {
      const rootField =
        state.schemaModel && state.config.rootFieldName
          ? findRootQueryField(state.schemaModel, state.config.rootFieldName)
          : null;
      if (!state.schemaModel || !rootField) return state;

      const alreadySelected = isPathSelected(state.config.selection, action.path);
      let next: FieldSelection[];
      if (alreadySelected) {
        // Unchecking an object clears its whole branch.
        next = setSelectionBranch(state.config.selection, action.path, null);
      } else {
        const branch = buildObjectDefaultBranch(state.schemaModel, state.governance, rootField.type, action.path);
        if (!branch) return state; // object has no directly selectable leaves - expand and pick nested fields instead
        next = setSelectionBranch(state.config.selection, action.path, branch);
      }
      const pruned = pruneEmptySelection(state.schemaModel, rootField.type, next);
      return { ...state, config: { ...state.config, selection: pruned } };
    }

    case 'SET_FIELD_ARGUMENT':
      return {
        ...state,
        config: {
          ...state.config,
          selection: updateFieldArgument(state.config.selection, action.path, action.value.path, action.value),
        },
      };

    case 'REMOVE_FIELD_ARGUMENT':
      return {
        ...state,
        config: {
          ...state.config,
          selection: updateFieldArgument(state.config.selection, action.path, action.argPath, null),
        },
      };

    case 'SET_SELECTION':
      return { ...state, config: { ...state.config, selection: action.selection } };

    case 'SET_OVERRIDE_WARNINGS':
      return { ...state, config: { ...state.config, overrideWarnings: action.value } };

    case 'EXECUTION_START':
      return { ...state, execution: { loading: true, result: null } };

    case 'EXECUTION_DONE':
      return { ...state, execution: { loading: false, result: action.result } };

    case 'LOAD_TEMPLATE':
      return { ...state, config: action.configuration };

    default:
      return state;
  }
}

interface WizardContextValue {
  state: WizardState;
  setStep: (step: number) => void;
  setConnection: (connection: GraphQLConnectionConfig) => void;
  schemaLoading: () => void;
  schemaLoaded: (model: IntrospectionSchemaModel, source: SchemaLoadStrategy) => void;
  schemaError: (error: string) => void;
  setGovernance: (governance: GovernanceConfig) => void;
  setIntentCategory: (categoryId: string | null) => void;
  setRootField: (fieldName: string) => void;
  setOperationName: (name: string) => void;
  setArgumentValue: (value: ArgumentValue) => void;
  removeArgumentValue: (path: string) => void;
  setTimeRange: (timeRange: TimeRangeConfig | null) => void;
  addDimensionFilter: (filter: DimensionFilterValue) => void;
  removeDimensionFilter: (dimensionKey: string) => void;
  setGroupBy: (keys: string[]) => void;
  setTimeBucket: (bucket: string | null) => void;
  toggleField: (path: string[]) => void;
  toggleObjectDefaults: (path: string[]) => void;
  setFieldArgument: (path: string[], value: ArgumentValue) => void;
  removeFieldArgument: (path: string[], argPath: string) => void;
  setSelection: (selection: FieldSelection[]) => void;
  setOverrideWarnings: (value: boolean) => void;
  executionStart: () => void;
  executionDone: (result: ExecuteQueryResult) => void;
  loadTemplate: (configuration: QueryConfiguration) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const value = useMemo<WizardContextValue>(
    () => ({
      state,
      setStep: (step) => dispatch({ type: 'SET_STEP', step }),
      setConnection: (connection) => dispatch({ type: 'SET_CONNECTION', connection }),
      schemaLoading: () => dispatch({ type: 'SCHEMA_LOADING' }),
      schemaLoaded: (model, source) => dispatch({ type: 'SCHEMA_LOADED', model, source }),
      schemaError: (error) => dispatch({ type: 'SCHEMA_ERROR', error }),
      setGovernance: (governance) => dispatch({ type: 'SET_GOVERNANCE', governance }),
      setIntentCategory: (categoryId) => dispatch({ type: 'SET_INTENT_CATEGORY', categoryId }),
      setRootField: (fieldName) => dispatch({ type: 'SET_ROOT_FIELD', fieldName }),
      setOperationName: (name) => dispatch({ type: 'SET_OPERATION_NAME', name }),
      setArgumentValue: (value) => dispatch({ type: 'SET_ARGUMENT_VALUE', value }),
      removeArgumentValue: (path) => dispatch({ type: 'REMOVE_ARGUMENT_VALUE', path }),
      setTimeRange: (timeRange) => dispatch({ type: 'SET_TIME_RANGE', timeRange }),
      addDimensionFilter: (filter) => dispatch({ type: 'ADD_DIMENSION_FILTER', filter }),
      removeDimensionFilter: (dimensionKey) => dispatch({ type: 'REMOVE_DIMENSION_FILTER', dimensionKey }),
      setGroupBy: (keys) => dispatch({ type: 'SET_GROUP_BY', keys }),
      setTimeBucket: (bucket) => dispatch({ type: 'SET_TIME_BUCKET', bucket }),
      toggleField: (path) => dispatch({ type: 'TOGGLE_FIELD', path }),
      toggleObjectDefaults: (path) => dispatch({ type: 'TOGGLE_OBJECT_DEFAULTS', path }),
      setFieldArgument: (path, value) => dispatch({ type: 'SET_FIELD_ARGUMENT', path, value }),
      removeFieldArgument: (path, argPath) => dispatch({ type: 'REMOVE_FIELD_ARGUMENT', path, argPath }),
      setSelection: (selection) => dispatch({ type: 'SET_SELECTION', selection }),
      setOverrideWarnings: (value) => dispatch({ type: 'SET_OVERRIDE_WARNINGS', value }),
      executionStart: () => dispatch({ type: 'EXECUTION_START' }),
      executionDone: (result) => dispatch({ type: 'EXECUTION_DONE', result }),
      loadTemplate: (configuration) => dispatch({ type: 'LOAD_TEMPLATE', configuration }),
    }),
    [state],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within a WizardProvider');
  return ctx;
}
