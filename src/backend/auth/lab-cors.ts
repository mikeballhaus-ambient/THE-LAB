import type { FastifyCorsOptions } from '@fastify/cors';
import { isLabProductionProfile } from '@/shared/config/lab-production-profile';

/** @deprecated Prefer `isLabProductionProfile()` from shared config. */
export function isProductionProfile(): boolean {
  return isLabProductionProfile();
}

function parseAllowedOrigins(): string[] {
  const raw = process.env.LAB_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Call during server startup (D-05 B). */
export function assertProductionCorsConfig(): void {
  if (!isProductionProfile()) {
    return;
  }
  const origins = parseAllowedOrigins();
  if (origins.length === 0) {
    throw new Error(
      'LAB_ALLOWED_ORIGINS must be set (comma-separated) when LAB_PRODUCTION_PROFILE=1',
    );
  }
}

export function resolveLabCorsOptions(): FastifyCorsOptions {
  const production = isProductionProfile();
  const allowlist = parseAllowedOrigins();

  if (production) {
    return {
      origin: allowlist,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Lab-User-Id',
        'X-Host-App-Id',
        'X-Lab-App-Service-Token',
      ],
    };
  }

  return {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      try {
        const url = new URL(origin);
        const host = url.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
          cb(null, true);
          return;
        }
      } catch {
        // fall through
      }
      if (allowlist.length > 0 && allowlist.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Lab-User-Id',
      'X-Host-App-Id',
      'X-Lab-App-Service-Token',
    ],
  };
}

/** Socket.IO CORS must not use `*` when the client uses `withCredentials`. */
export function resolveSocketIoCorsOptions(): {
  origin:
    | string
    | string[]
    | ((
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => void);
  credentials: boolean;
} {
  if (isProductionProfile()) {
    return {
      origin: parseAllowedOrigins(),
      credentials: true,
    };
  }

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          callback(null, true);
          return;
        }
      } catch {
        // fall through
      }
      const allowlist = parseAllowedOrigins();
      if (allowlist.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  };
}
