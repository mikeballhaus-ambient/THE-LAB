function hostPortLabel(discoveryUrl: string): string {
  try {
    const url = new URL(discoveryUrl);
    const port =
      url.port ||
      (url.protocol === 'https:' ? '443' : url.protocol === 'http:' ? '80' : '');
    return port ? `${url.hostname}:${port}` : url.hostname;
  } catch {
    return 'the host app';
  }
}

function networkErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }
  const cause = (err as { cause?: { code?: string } }).cause;
  if (cause?.code) {
    return cause.code;
  }
  const code = (err as { code?: string }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * User-facing message when Chart Builder cannot reach a connector discovery URL
 * (verify, preview, or register).
 */
export function describeDiscoveryFetchFailure(
  discoveryUrl: string,
  err: unknown,
  httpStatus?: number,
): string {
  const target = hostPortLabel(discoveryUrl);
  const launchHint =
    'Launch the host app from the THE-LAB app catalog (or start its server), then verify again.';

  const code = networkErrorCode(err);
  const message = err instanceof Error ? err.message.toLowerCase() : '';

  if (
    code === 'ECONNREFUSED'
    || code === 'ENOTFOUND'
    || code === 'ETIMEDOUT'
    || code === 'ECONNRESET'
    || message.includes('fetch failed')
    || message.includes('econnrefused')
    || message.includes('network')
  ) {
    return `Cannot reach ${target}. The catalog or pilot app for this connector is probably not running. ${launchHint}`;
  }

  if (httpStatus === 401) {
    return `Discovery at ${target} returned 401 Unauthorized. Stay signed in to THE-LAB and verify again.`;
  }

  if (httpStatus === 404) {
    return `Discovery URL was not found (HTTP 404) at ${target}. The app may be stopped, on a different port, or the stored URL is outdated. ${launchHint}`;
  }

  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    return `Discovery at ${target} returned HTTP ${httpStatus}. The host app may still be starting or is unavailable. ${launchHint}`;
  }

  if (httpStatus != null && httpStatus >= 400) {
    return `Discovery at ${target} failed (HTTP ${httpStatus}). ${launchHint}`;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return `Discovery failed for ${target}. ${launchHint}`;
}
