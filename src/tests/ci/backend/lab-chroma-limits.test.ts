import { afterEach, describe, expect, test } from '@jest/globals';
import {
  defaultSessionRetrieveLimit,
  resolveSessionDeleteFetchLimit,
  resolveSessionMessageFetchLimit,
  resolveSessionMessageLimit,
  resolveSummaryQueryLimit,
} from '@/shared/config/lab-chroma-limits';

describe('lab-chroma-limits (2.3)', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  test('resolveSessionMessageLimit defaults to 120 and clamps requests', () => {
    delete process.env.LAB_CHROMA_SESSION_NRESULTS;
    expect(defaultSessionRetrieveLimit()).toBe(120);
    expect(resolveSessionMessageLimit(999)).toBe(120);
  });

  test('resolveSessionMessageLimit honors env cap', () => {
    process.env.LAB_CHROMA_SESSION_NRESULTS = '80';
    expect(resolveSessionMessageLimit()).toBe(80);
    expect(resolveSessionMessageLimit(200)).toBe(80);
  });

  test('fetch limit is at least message cap', () => {
    process.env.LAB_CHROMA_SESSION_NRESULTS = '100';
    process.env.LAB_CHROMA_SESSION_FETCH_LIMIT = '250';
    expect(resolveSessionMessageFetchLimit()).toBe(250);
  });

  test('resolveSummaryQueryLimit caps semantic query size', () => {
    delete process.env.LAB_CHROMA_SUMMARY_NRESULTS;
    delete process.env.LAB_CHROMA_SUMMARY_MAX;
    expect(resolveSummaryQueryLimit()).toBe(8);
    expect(resolveSummaryQueryLimit(100)).toBe(8);
    process.env.LAB_CHROMA_SUMMARY_MAX = '20';
    expect(resolveSummaryQueryLimit(100)).toBe(8);
    process.env.LAB_CHROMA_SUMMARY_NRESULTS = '15';
    expect(resolveSummaryQueryLimit(100)).toBe(15);
  });

  test('resolveSessionDeleteFetchLimit defaults to 2000', () => {
    delete process.env.LAB_CHROMA_SESSION_DELETE_LIMIT;
    expect(resolveSessionDeleteFetchLimit()).toBe(2000);
  });
});
