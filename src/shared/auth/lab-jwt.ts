import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_DEV_SECRET = 'the-lab-dev-jwt-secret-change-in-production';

export interface LabJwtPayload {
  sub: number;
  email: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

export function getJwtSecret(): string {
  const secret = process.env.LAB_JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.LAB_PRODUCTION_PROFILE === '1') {
    throw new Error('LAB_JWT_SECRET is required when LAB_PRODUCTION_PROFILE=1');
  }
  return DEFAULT_DEV_SECRET;
}

export function signLabUserJwt(userId: number, email: string, ttlSeconds = 3600): string {
  const secret = getJwtSecret();
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload: LabJwtPayload = {
    sub: userId,
    email,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyLabUserJwt(token: string): LabJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [header, body, sig] = parts;
    const secret = getJwtSecret();
    const data = `${header}.${body}`;
    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(body).toString('utf8')) as LabJwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now || payload.sub < 1) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}
