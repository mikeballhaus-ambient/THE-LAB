import { describe, expect, test } from '@jest/globals';
import {
  LAB_WORKFLOW_HTTP_MAX_REDIRECTS,
  validateOutboundUrl,
  validateRedirectTarget,
} from '@/shared/utils/lab-workflow-outbound-url';

/**
 * W10b — SSRF guards.
 *
 * Every case here is a real bypass somebody has used against a URL validator. They are grouped by the
 * trick, because the value of the suite is that a future change can be checked against the *list of
 * tricks* rather than against one example of each.
 */

describe('scheme and shape', () => {
  test('accepts a normal https URL', () => {
    const result = validateOutboundUrl('https://api.example.com/v1/records');
    expect(result.ok).toBe(true);
    expect(result.url?.hostname).toBe('api.example.com');
    expect(result.warnings).toEqual([]);
  });

  test('accepts http but warns about cleartext', () => {
    const result = validateOutboundUrl('http://api.example.com/hook');
    expect(result.ok).toBe(true);
    expect(result.warnings.join(' ')).toContain('not encrypted');
  });

  test.each([
    ['file', 'file:///etc/passwd'],
    ['gopher', 'gopher://example.com/'],
    ['ftp', 'ftp://example.com/x'],
    ['javascript', 'javascript:alert(1)'],
  ])('rejects the %s scheme', (_name, url) => {
    expect(validateOutboundUrl(url).rejection).toBe('unsupported_scheme');
  });

  test('rejects a relative URL', () => {
    // A workflow has no page context; `/v1/records` is a mistake, not something to resolve.
    expect(validateOutboundUrl('/v1/records').rejection).toBe('not_absolute');
    expect(validateOutboundUrl('api.example.com/x').rejection).toBe('not_absolute');
  });

  test('rejects an empty URL', () => {
    expect(validateOutboundUrl('   ').rejection).toBe('not_absolute');
  });

  test('rejects credentials embedded in the URL', () => {
    // They would land in the graph, the run history and the logs.
    expect(validateOutboundUrl('https://user:pass@api.example.com/x').rejection).toBe(
      'credentials_in_url',
    );
  });
});

describe('loopback and link-local', () => {
  test.each([
    ['localhost', 'http://localhost:3000/x'],
    ['127.0.0.1', 'http://127.0.0.1/x'],
    ['127.x', 'http://127.1.2.3/x'],
    ['IPv6 loopback', 'http://[::1]/x'],
    ['IPv4-mapped IPv6 loopback', 'http://[::ffff:127.0.0.1]/x'],
  ])('rejects %s', (_name, url) => {
    const result = validateOutboundUrl(url);
    expect(result.ok).toBe(false);
    expect(['blocked_host', 'blocked_address']).toContain(result.rejection);
  });

  test.each([
    ['AWS/GCP metadata address', 'http://169.254.169.254/latest/meta-data/'],
    ['IPv6 link-local', 'http://[fe80::1]/x'],
    ['IPv4-mapped link-local', 'http://[::ffff:169.254.169.254]/x'],
  ])('rejects the %s', (_name, url) => {
    expect(validateOutboundUrl(url).rejection).toBe('blocked_address');
  });

  test.each([
    ['metadata', 'http://metadata.google.internal/computeMetadata'],
    ['metadata.goog', 'http://metadata.goog/x'],
  ])('rejects the named metadata host %s', (_name, url) => {
    expect(validateOutboundUrl(url).rejection).toBe('blocked_host');
  });
});

describe('private ranges', () => {
  test.each([
    ['10/8', 'http://10.0.0.5/x'],
    ['172.16/12 low', 'http://172.16.0.1/x'],
    ['172.16/12 high', 'http://172.31.255.254/x'],
    ['192.168/16', 'http://192.168.1.1/x'],
    ['0.0.0.0/8', 'http://0.0.0.0/x'],
    ['carrier-grade NAT', 'http://100.64.0.1/x'],
    ['benchmarking range', 'http://198.18.0.1/x'],
    ['IPv6 unique-local', 'http://[fd00::1]/x'],
    ['IPv6 unique-local fc', 'http://[fc00::1]/x'],
  ])('rejects %s', (_name, url) => {
    expect(validateOutboundUrl(url).rejection).toBe('blocked_address');
  });

  test('accepts a public address that is adjacent to a private range', () => {
    // 172.32.x is *outside* 172.16/12 — an off-by-one in the range check would reject real hosts.
    expect(validateOutboundUrl('http://172.32.0.1/x').ok).toBe(true);
  });

  test('rejects a bare hostname with no dot', () => {
    // `http://redis:6379` is an internal service. A workflow author who means it can allow-list it.
    expect(validateOutboundUrl('http://redis:6379/x').rejection).toBe('blocked_host');
  });
});

describe('allow list', () => {
  test('an empty allow list permits any public host', () => {
    expect(validateOutboundUrl('https://anything.example.com', { allowList: [] }).ok).toBe(true);
  });

  test('a non-empty allow list restricts to its entries', () => {
    // This is the important semantic: the list is a *restriction*, not an addition.
    expect(
      validateOutboundUrl('https://api.example.com/x', { allowList: ['api.example.com'] }).ok,
    ).toBe(true);
    expect(
      validateOutboundUrl('https://other.example.com/x', { allowList: ['api.example.com'] }).rejection,
    ).toBe('not_in_allow_list');
  });

  test('a leading dot allows the domain and its subdomains', () => {
    const policy = { allowList: ['.example.com'] };
    expect(validateOutboundUrl('https://example.com/x', policy).ok).toBe(true);
    expect(validateOutboundUrl('https://api.example.com/x', policy).ok).toBe(true);
  });

  test('a leading dot does not allow a lookalike domain', () => {
    // `example.com.evil.test` ends with neither `.example.com` nor equals `example.com`.
    expect(
      validateOutboundUrl('https://example.com.evil.test/x', { allowList: ['.example.com'] }).rejection,
    ).toBe('not_in_allow_list');
  });

  test('the allow list is matched case-insensitively', () => {
    expect(
      validateOutboundUrl('https://API.Example.COM/x', { allowList: ['api.example.com'] }).ok,
    ).toBe(true);
  });

  test('an allow list does not override a blocked address', () => {
    // Deny-first: listing an internal host must not make the lab reachable from a payload.
    expect(
      validateOutboundUrl('http://127.0.0.1/x', { allowList: ['127.0.0.1'] }).rejection,
    ).toBe('blocked_address');
  });
});

describe('redirects', () => {
  test('resolves a relative redirect against the base', () => {
    const result = validateRedirectTarget('/v2/records', 'https://api.example.com/v1/records');
    expect(result.ok).toBe(true);
    expect(result.url?.toString()).toBe('https://api.example.com/v2/records');
  });

  test('rejects a redirect into the metadata service', () => {
    // The classic bypass: a permitted host redirects to link-local. Every hop must be checked.
    const result = validateRedirectTarget(
      'http://169.254.169.254/latest/meta-data/',
      'https://api.example.com/v1/records',
      {},
    );
    expect(result.rejection).toBe('blocked_address');
  });

  test('rejects a redirect that falls outside the allow list', () => {
    const result = validateRedirectTarget(
      'https://other.example.org/x',
      'https://api.example.com/v1/records',
      { allowList: ['api.example.com'] },
    );
    expect(result.rejection).toBe('not_in_allow_list');
  });

  test('rejects a redirect to a non-http scheme', () => {
    expect(
      validateRedirectTarget('file:///etc/passwd', 'https://api.example.com/x').rejection,
    ).toBe('unsupported_scheme');
  });

  test('the redirect cap is small enough to bound a loop', () => {
    expect(LAB_WORKFLOW_HTTP_MAX_REDIRECTS).toBeGreaterThan(0);
    expect(LAB_WORKFLOW_HTTP_MAX_REDIRECTS).toBeLessThanOrEqual(10);
  });
});
