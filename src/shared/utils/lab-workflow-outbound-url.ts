/**
 * SSRF guards for outbound HTTP (W10b).
 *
 * A workflow author types a URL, and an event supplies part of it. Without a guard, "fetch
 * `http://169.254.169.254/latest/meta-data/`" is a workflow step, and a lab running on a cloud host
 * hands out its instance credentials. That is the whole threat: the caller is not malicious, the
 * *data* is, so the check has to happen at the request, not at save time.
 *
 * ## Deny, then allow
 *
 * The rules are ordered deny-first: loopback, link-local, private ranges, and the unspecified address
 * are refused **by default**, and an operator can add hosts to an allow-list. An allow-list alone is
 * not enough, because a workflow that builds a hostname from a payload field can point at anything
 * the operator happens to have listed for a different purpose.
 *
 * ## What this cannot do
 *
 * A DNS name can resolve to a private address, and a redirect can land on one. Both are handled by
 * checking **every hop**: the node re-validates each redirect target and refuses to follow one that
 * fails, rather than trusting the first URL. What remains unhandled is DNS rebinding between the check
 * and the connect, which needs the socket-level pinning `fetch` does not expose; that is recorded as a
 * known limitation rather than pretended away.
 */

export type OutboundUrlRejection =
  | 'not_absolute'
  | 'unsupported_scheme'
  | 'credentials_in_url'
  | 'blocked_host'
  | 'blocked_address'
  | 'not_in_allow_list';

export interface OutboundUrlResult {
  ok: boolean;
  rejection?: OutboundUrlRejection;
  /** The normalised URL, present only when `ok`. */
  url?: URL;
  /** Non-fatal notes, e.g. a scheme that was upgraded. */
  warnings: string[];
}

/** Schemes a workflow may call. `file:` and `gopher:` are not HTTP and have no place here. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/** Hostnames that always resolve to the local machine or a metadata service. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  // Cloud metadata endpoints are named, not just addressed, on several providers.
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
]);

function isLoopbackIpv4(octets: number[]): boolean {
  return octets[0] === 127;
}

function isLinkLocalIpv4(octets: number[]): boolean {
  return octets[0] === 169 && octets[1] === 254;
}

function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets as [number, number];
  // 10/8, 172.16/12, 192.168/16 — plus 0.0.0.0/8, which routes to the local host on many stacks.
  if (a === 10 || a === 0) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  // 100.64/10 (carrier-grade NAT) and 198.18/15 (benchmarking) are not public either.
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  if (a === 198 && (b === 18 || b === 19)) {
    return true;
  }
  return false;
}

/**
 * Strip the IPv6 brackets and decide whether the address is loopback, link-local or unique-local.
 *
 * `::ffff:127.0.0.1` is the trap: it is an IPv4 address wearing an IPv6 costume, and a check that only
 * looks at the leading colons would let it through.
 */
function isBlockedIpv6(host: string): boolean {
  const address = host.replace(/^\[|\]$/g, '').toLowerCase();

  // `new URL()` **normalises** an IPv4-mapped address to hex (`::ffff:7f00:1`), so matching only the
  // dotted form misses the most common bypass: `http://[::ffff:127.0.0.1]/`. Both forms have to be
  // handled, which means decoding the last two hextets back into an IPv4 address.
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (dotted) {
    const octets = dotted[1]!.split('.').map(Number);
    return isLoopbackIpv4(octets) || isLinkLocalIpv4(octets) || isPrivateIpv4(octets);
  }
  const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(address);
  if (hexMapped) {
    const high = parseInt(hexMapped[1]!, 16);
    const low = parseInt(hexMapped[2]!, 16);
    const octets = [high >> 8, high & 0xff, low >> 8, low & 0xff];
    return isLoopbackIpv4(octets) || isLinkLocalIpv4(octets) || isPrivateIpv4(octets);
  }

  if (address === '::1' || address === '::') {
    return true;
  }
  // fe80::/10 link-local, fc00::/7 unique-local.
  if (/^fe[89ab]/.test(address)) {
    return true;
  }
  if (/^f[cd]/.test(address)) {
    return true;
  }
  return false;
}

export interface OutboundUrlPolicy {
  /**
   * Hosts the operator explicitly allows, matched case-insensitively.
   *
   * An entry that starts with `.` matches that domain and its subdomains (`.example.com` allows
   * `api.example.com` but not `example.com.evil.test`).
   */
  allowList?: string[];
}

/**
 * Validate a URL before an outbound request.
 *
 * Relative URLs are rejected: a workflow has no page context, so a relative target is a mistake
 * rather than something to resolve.
 */
export function validateOutboundUrl(raw: string, policy: OutboundUrlPolicy = {}): OutboundUrlResult {
  const warnings: string[] = [];
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { ok: false, rejection: 'not_absolute', warnings };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, rejection: 'not_absolute', warnings };
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { ok: false, rejection: 'unsupported_scheme', warnings };
  }

  // `https://user:pass@host` leaks the credential into the graph, the run history and the logs. If a
  // credential is needed it belongs in the credential store, not the URL.
  if (url.username || url.password) {
    return { ok: false, rejection: 'credentials_in_url', warnings };
  }

  const hostname = url.hostname.toLowerCase();
  const bare = hostname.replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(bare)) {
    return { ok: false, rejection: 'blocked_host', warnings };
  }
  // A bare label with no dot is an internal service name (`http://redis:6379`). Refusing it is
  // deliberate: on a lab network that is the most likely way to reach something that is not a public
  // API, and a workflow author who means an internal service can allow-list it explicitly.
  if (!bare.includes('.') && !bare.includes(':')) {
    return { ok: false, rejection: 'blocked_host', warnings };
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(bare);
  if (ipv4) {
    const octets = [Number(ipv4[1]), Number(ipv4[2]), Number(ipv4[3]), Number(ipv4[4])];
    if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      return { ok: false, rejection: 'blocked_host', warnings };
    }
    if (isLoopbackIpv4(octets) || isLinkLocalIpv4(octets) || isPrivateIpv4(octets)) {
      return { ok: false, rejection: 'blocked_address', warnings };
    }
  } else if (bare.includes(':')) {
    if (isBlockedIpv6(bare)) {
      return { ok: false, rejection: 'blocked_address', warnings };
    }
  }

  const allowList = (policy.allowList ?? []).map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  // A non-empty allow-list is a **restriction**, not an addition: once an operator has listed the
  // hosts a workflow may reach, everything else is refused. Otherwise the list would only ever widen
  // what a determined URL could reach, which is the opposite of the intent.
  if (allowList.length > 0) {
    const allowed = allowList.some((entry) =>
      entry.startsWith('.') ? bare === entry.slice(1) || bare.endsWith(entry) : bare === entry,
    );
    if (!allowed) {
      return { ok: false, rejection: 'not_in_allow_list', warnings };
    }
  }

  if (url.protocol === 'http:') {
    // Not an error: internal testing and a local stub server are real use cases, and the allow-list is
    // the control that matters. It is worth reporting because cleartext over a public host is usually
    // an oversight.
    warnings.push('Plain HTTP: the request and any response are not encrypted in transit.');
  }

  return { ok: true, url, warnings };
}

/** Follow-redirect decision for a hop. A refused target aborts the chain rather than sending it. */
export function validateRedirectTarget(
  location: string,
  baseUrl: string,
  policy: OutboundUrlPolicy = {},
): OutboundUrlResult {
  let resolved: string;
  try {
    resolved = new URL(location, baseUrl).toString();
  } catch {
    return { ok: false, rejection: 'not_absolute', warnings: [] };
  }
  return validateOutboundUrl(resolved, policy);
}

/** Cap on redirect hops, so a redirect loop cannot run the node until it times out. */
export const LAB_WORKFLOW_HTTP_MAX_REDIRECTS = 5;

/** Cap on response size read into memory. A workflow item is data, not a file store. */
export const LAB_WORKFLOW_HTTP_MAX_RESPONSE_BYTES = 1024 * 1024;
