#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = process.argv[2];

if (!file) {
  console.error("Error: You must pass a file path.");
  process.exit(1);
}

const resolved = path.resolve(file);

// Build ESLint command for a single file
// --ext is optional if your eslint config already handles it
const cmd = `npx eslint "${resolved}" --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx`;

let output = "";
let failed = false;

try {
  // Capture output without throwing
  output = execSync(cmd, { stdio: "pipe" }).toString();
  console.log("No ESLint errors.");
} catch (err) {
  failed = true;
  const stdout = err.stdout?.toString() || "";
  const stderr = err.stderr?.toString() || "";
  output = (stdout + stderr).trim() || err.message || "Unknown ESLint error";

  console.error(output);
}

// Append to docs/platform/errors.md
const errorsPath = path.resolve(__dirname, "../docs/platform/errors.md");

if (output.trim()) {
  fs.appendFileSync(
    errorsPath,
    `\n\n=== LINT ERRORS FOR FILE: ${file} ===\n${output}\n`
  );
}

// Exit non-zero on lint errors.
//
// This used to be an unconditional `process.exit(0)` ("Do not fail CI"), which made the script
// incapable of reporting failure: it printed the errors and returned success, so a caller checking the
// exit code — or an agent chaining `lint-file a && lint-file b` — treated a broken file as clean. CI
// does **not** use this script (`npm run lint` is the gate), so failing here costs nothing and removes
// a silent-pass trap.
process.exit(failed ? 1 : 0);
