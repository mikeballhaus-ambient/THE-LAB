import {
  LAB_WORKFLOW_HTTP_MAX_REDIRECTS,
  validateRedirectTarget,
} from '@/shared/utils/lab-workflow-outbound-url';

/**
 * Outbound HTTP for the `http_request` node (W10b).
 *
 * ## Why a helper rather than `fetch(url)` in the node
 *
 * Redirects. `fetch` follows them automatically, and a permitted host can redirect to
 * `169.254.169.254` — so a URL that passed validation reaches an address that would have been refused.
 * Following redirects by hand is the only way to validate **every hop**, which is what this does:
 * `redirect: 'manual'` plus a loop that re-runs the same guard on each `Location`.
 *
 * ## What this deliberately does not do
 *
 * - No cookie jar: a workflow is not a browser session, and carrying cookies between nodes would leak
 *   one caller's identity into another's request.
 * - No automatic retry: retry policy belongs to the node (`executeNodeWithPolicy`), which already
 *   knows about idempotency keys. Retrying here would multiply attempts.
 * - No socket-level address pinning. A DNS name can resolve to a private address between validation
 *   and connect (rebinding). Closing that needs a custom agent, which `fetch` does not expose; it is a
 *   recorded limitation of this implementation rather than something silently assumed safe.
 */

export interface OutboundFetchParams {
  url: URL;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  signal: AbortSignal;
  allowList?: string[];
}

/**
 * Perform a request, following redirects **manually** so each target is re-validated.
 *
 * Throws when a redirect target is refused: the caller counts a thrown request as a failure, and
 * silently returning the redirect response would hand the workflow a 302 body it cannot use.
 */
export async function fetchOutbound(params: OutboundFetchParams): Promise<Response> {
  let current = params.url;

  for (let hop = 0; hop <= LAB_WORKFLOW_HTTP_MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current, {
      method: params.method,
      headers: params.headers,
      body: params.body,
      signal: params.signal,
      // Manual: the loop below decides whether the next hop is allowed.
      redirect: 'manual',
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      // A redirect status with no `Location` is malformed; return it so the node reports a failure
      // rather than looping.
      return response;
    }

    const next = validateRedirectTarget(location, current.toString(), {
      allowList: params.allowList,
    });
    if (!next.ok || !next.url) {
      throw new Error(`Redirect refused (${next.rejection ?? 'invalid_target'}): ${location}`);
    }
    current = next.url;
  }

  throw new Error(`Too many redirects (limit ${LAB_WORKFLOW_HTTP_MAX_REDIRECTS})`);
}
