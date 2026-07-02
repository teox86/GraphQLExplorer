/** Shapes matching the standard GraphQL introspection JSON response. */

export interface RawTypeRef {
  kind: string;
  name: string | null;
  ofType: RawTypeRef | null;
}

export interface RawInputValue {
  name: string;
  description: string | null;
  type: RawTypeRef;
  defaultValue: string | null;
}

export interface RawField {
  name: string;
  description: string | null;
  args: RawInputValue[];
  type: RawTypeRef;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface RawEnumValue {
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface RawFullType {
  kind: string;
  name: string | null;
  description: string | null;
  fields: RawField[] | null;
  inputFields: RawInputValue[] | null;
  interfaces: { name: string }[] | null;
  enumValues: RawEnumValue[] | null;
  possibleTypes: { name: string }[] | null;
}

export interface RawIntrospectionResponse {
  __schema: {
    queryType: { name: string };
    mutationType: { name: string } | null;
    subscriptionType: { name: string } | null;
    types: RawFullType[];
  };
}
