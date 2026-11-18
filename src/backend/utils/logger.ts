// logger.ts — fully Vite-safe, no top-level Node imports

type FsModule = typeof import('fs');
type PathModule = typeof import('path');
type UrlModule = typeof import('url');

let fsApi: Promise<FsModule | null>;
let pathApi: Promise<PathModule | null>;
let urlApi: Promise<UrlModule | null>;

const isNode =
  typeof process !== "undefined" &&
  process.versions &&
  process.versions.node;

// Load Node modules only at runtime, never at build time
if (isNode) {
  fsApi = import(/* @vite-ignore */ "fs");
  pathApi = import(/* @vite-ignore */ "path");
  urlApi = import(/* @vite-ignore */ "url");
} else {
  fsApi = Promise.resolve(null);
  pathApi = Promise.resolve(null);
  urlApi = Promise.resolve(null);
}

// Config
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB
const LOG_FOLDER_NAME = "logs";
const LOG_FILE_NAME = "the-lab.log";

// Logging enabled/disabled flag from .env
// 0 = no logging, 1 = logging enabled
let loggingEnabled: boolean = false;

if (isNode && typeof process !== "undefined" && process.env) {
  const envValue = Number(process.env.VITE_LOGGING_ENABLED);
  if (!isNaN(envValue)) {
    loggingEnabled = envValue === 1;
  }
}

import { isStructuredLoggingEnabled } from '../../shared/config/lab-structured-logging';
import { getRequestCorrelation } from './request-correlation';

export class VSCodeLogger {
  private static instance: VSCodeLogger | null = null;
  private logDir: string | null = null;
  private logFile: string | null = null;

  private constructor() {}

  static async getInstance() {
    if (!this.instance) {
      const logger = new VSCodeLogger();
      await logger.initialize();
      this.instance = logger;
    }
    return this.instance;
  }

  private async initialize() {
    const fs = await fsApi;
    const path = await pathApi;
    const url = await urlApi;

    if (!fs || !path || !url) {
      // Browser fallback
      this.logDir = null;
      this.logFile = null;
      return;
    }

    // Resolve __dirname dynamically
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // logs folder relative to backend/utils
    this.logDir = path.join(__dirname, "../../../", LOG_FOLDER_NAME);
    this.logFile = path.join(this.logDir, LOG_FILE_NAME);

    // Ensure logs directory exists
    await fs.promises.mkdir(this.logDir, { recursive: true });
  }

  private async rotateIfNeeded() {
    const fs = await fsApi;
    const path = await pathApi;

    if (!fs || !path || !this.logFile || !this.logDir) return;

    const stats = await fs.promises.stat(this.logFile).catch(() => null);
    if (!stats || stats.size < MAX_LOG_SIZE) return;

    // Find next available backup
    let index = 1;
    let rotated = path.join(this.logDir, `${LOG_FILE_NAME}.${index}`);

    while (await fs.promises.stat(rotated).catch(() => null)) {
      index++;
      rotated = path.join(this.logDir, `${LOG_FILE_NAME}.${index}`);
    }

    await fs.promises.rename(this.logFile, rotated);
  }

  private async write(level: string, message: string) {
    const fs = await fsApi;

    // Check if logging is enabled
    if (!loggingEnabled) {
      // Logging disabled - skip file writing
      return;
    }

    const timestamp = new Date().toISOString();
    const configLine = `VITE_LOGGING_ENABLED=${loggingEnabled ? "1" : "0"}`;
    const line = `[${timestamp}] [${level}] (${configLine}) ${message}\n`;

    // Browser fallback
    if (!fs || !this.logFile) {
      console.log(line);
      return;
    }

    try {
      await this.rotateIfNeeded();
      await fs.promises.appendFile(this.logFile, line, "utf8");
    } catch (err) {
      console.error("Failed to write log:", err);
    }
  }

  info(message: string) {
    this.write("info", message);
  }

  warn(message: string) {
    this.write("warn", message);
  }

  error(message: string) {
    this.write("error", message);
  }

  raw(message: string) {
    this.write("raw", message);
  }

  json(message: string, json: unknown) {
    this.write("json", `${message} - ${JSON.stringify(json)}`);
  }

  structured(level: 'info' | 'warn' | 'error', event: string, fields: Record<string, unknown> = {}) {
    const correlation = getRequestCorrelation();
    const payload = {
      ts: new Date().toISOString(),
      level,
      event,
      correlationId: correlation?.correlationId,
      sessionId: correlation?.sessionId,
      ...fields,
    };
    if (isStructuredLoggingEnabled()) {
      this.write(level, JSON.stringify(payload));
    } else if (loggingEnabled) {
      this.write(level, `[${event}] ${JSON.stringify(fields)}`);
    }
  }
}
