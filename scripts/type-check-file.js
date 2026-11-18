#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = process.argv[2];

if (!file) {
  console.error("Error: You must pass a file path.");
  process.exit(1);
}

const errorsPath = path.resolve(__dirname, "../docs/platform/errors.md");
const relativeWindowsPath = path.relative(process.cwd(), file);
const cleanRelativePath = relativeWindowsPath.split(path.sep).join('/');

function runSync(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (err) {
    const stdout = err.output?.[1]?.toString() || "";
    const stderr = err.output?.[2]?.toString() || "";
    return (stdout + stderr).trim();
  }
}

function filterErrors(output) {
  if (!output) return "";
  const pathRegex = new RegExp(cleanRelativePath);
  return output
    .split("\n")
    .filter(line => pathRegex.test(line))
    .join("\n")
    .trim();
}

console.log(`Checking types for: ${cleanRelativePath}`);

const mcpConfigPath = path.resolve(process.cwd(), "tsconfig.mcp.json");
const mcpConfigContent = {
  extends: "./tsconfig.json",
  compilerOptions: {
    skipLibCheck: true,
    noEmit: true,
    incremental: false
  },
  include: [cleanRelativePath]
};

try {
  fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfigContent, null, 2), "utf8");
} catch (configErr) {
  console.error("Failed to write temporary tsconfig.mcp.json:", configErr);
  process.exit(1);
}

// Global try block to guarantee cleanup happens via 'finally'
try {
  const command = `npx vue-tsc -p tsconfig.mcp.json --noEmit --pretty false`;
  const vueTscOutput = runSync(command);
  const vueFiltered = filterErrors(vueTscOutput);

  const uniqueErrors = Array.from(new Set([vueFiltered].filter(Boolean)));
  const combined = uniqueErrors.join("\n");

  if (combined) {
    console.error(combined);
    fs.appendFileSync(
      errorsPath,
      `\n\n=== TYPE ERRORS FOR FILE: ${file} ===\n${combined}\n`
    );
  } else {
    console.log("No TypeScript errors for this file.");
  }
} catch (scriptError) {
  console.error("An unexpected error occurred during execution:", scriptError);
} finally {
  // CRITICAL CLEANUP: This block ALWAYS runs before the script stops
  try {
    if (fs.existsSync(mcpConfigPath)) {
      fs.unlinkSync(mcpConfigPath);
    }
  } catch {

  }
  
  process.exit(0);
}
