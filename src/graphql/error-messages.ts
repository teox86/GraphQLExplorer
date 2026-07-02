import type { ExecuteQueryResult } from './client';

/** Best-effort mapping of raw GraphQL/network errors to a friendlier one-liner. Falls back to the raw message. */
export function friendlyErrorMessage(result: ExecuteQueryResult): string {
  if (result.networkError) {
    if (/failed to fetch|networkerror/i.test(result.networkError)) {
      return 'Could not reach the endpoint. Check the URL and your network connection.';
    }
    if (/cors/i.test(result.networkError)) {
      return 'The server rejected the request due to CORS policy. This endpoint may not allow browser-based requests.';
    }
    return result.networkError;
  }

  const first = result.errors?.[0];
  if (!first) return 'Unknown error.';

  if (/unauthorized|forbidden|401|403/i.test(first.message)) {
    return 'Authentication failed. Check your Authorization header / token.';
  }
  if (/timeout/i.test(first.message)) {
    return 'The request timed out. Try narrowing the time range or reducing the selected fields.';
  }
  if (/cannot query field/i.test(first.message)) {
    return `The generated query referenced a field that does not exist on the current schema: ${first.message}`;
  }
  if (/variable .* got invalid value/i.test(first.message)) {
    return `One of the arguments has an invalid value: ${first.message}`;
  }
  return first.message;
}
