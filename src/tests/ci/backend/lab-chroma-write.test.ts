import { afterEach, describe, expect, test } from '@jest/globals';
import {
  allowChromaDegradedStartup,
  isChromaAsyncWriteEnabled,
} from '@/shared/config/lab-chroma-write';

describe('lab-chroma-write (2.4)', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  test('async write enabled by default', () => {
    delete process.env.LAB_CHROMA_ASYNC_WRITE;
    expect(isChromaAsyncWriteEnabled()).toBe(true);
  });

  test('async write can be disabled', () => {
    process.env.LAB_CHROMA_ASYNC_WRITE = '0';
    expect(isChromaAsyncWriteEnabled()).toBe(false);
  });

  test('degraded startup allowed when not production profile', () => {
    delete process.env.LAB_CHROMA_DEGRADED_OK;
    delete process.env.LAB_PRODUCTION_PROFILE;
    expect(allowChromaDegradedStartup()).toBe(true);
  });

  test('degraded startup blocked in production profile unless explicit', () => {
    process.env.LAB_PRODUCTION_PROFILE = '1';
    delete process.env.LAB_CHROMA_DEGRADED_OK;
    expect(allowChromaDegradedStartup()).toBe(false);
    process.env.LAB_CHROMA_DEGRADED_OK = '1';
    expect(allowChromaDegradedStartup()).toBe(true);
  });
});
