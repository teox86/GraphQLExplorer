/**
 * Collects the GraphQL variables used by a generated operation: their names,
 * declared types, and values. Root-query arguments keep their exact names
 * (which the field references by argument name); nested field arguments get
 * unique, sanitized names to avoid collisions across the selection tree.
 */
export interface VariableDefinition {
  name: string;
  graphQLType: string;
}

function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+/, '');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `v_${cleaned}`;
}

export class VariableRegistry {
  private readonly used = new Set<string>();
  readonly definitions: VariableDefinition[] = [];
  readonly values: Record<string, unknown> = {};

  /** Registers a variable whose name must be used verbatim (root-query args). */
  addExact(name: string, graphQLType: string, value: unknown): string {
    if (this.used.has(name)) return name;
    this.used.add(name);
    this.definitions.push({ name, graphQLType });
    this.values[name] = value;
    return name;
  }

  /** Registers a variable, deriving a unique name from `preferredName`. */
  add(preferredName: string, graphQLType: string, value: unknown): string {
    const base = sanitize(preferredName);
    let name = base;
    let counter = 2;
    while (this.used.has(name)) {
      name = `${base}_${counter}`;
      counter += 1;
    }
    this.used.add(name);
    this.definitions.push({ name, graphQLType });
    this.values[name] = value;
    return name;
  }
}
