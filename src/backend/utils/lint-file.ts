export interface LintValidatorResult {
  success: boolean;
  output: string;
}

let childProcessModule: Promise<typeof import('child_process')>;

if (typeof window === 'undefined') {
    childProcessModule = import('child_process');
} else {
    childProcessModule = Promise.resolve({} as unknown as typeof import('child_process'));
}

const { spawn: serverSpawn } = await childProcessModule;

export class LintValidator {
  static run(file: string): Promise<LintValidatorResult> {
    return new Promise((resolve) => {
      const cwd = process.cwd()
      const child = serverSpawn("node", ["scripts/lint-file.js", file], {
        cwd: cwd,
        // CRITICAL FIX 1: Enable shell so paths resolve normally on Windows
        shell: true,
        // CRITICAL FIX 2: Pass down the parent environment (vital for fast npx evaluation)
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"]
      });

      let output = "";

      child.stdout.on("data", (d) => (output += d.toString()));
      child.stderr.on("data", (d) => (output += d.toString()));

      child.on("close", () => {
        const hasErrors =
          /error\s+/i.test(output) ||
          /warning\s+/i.test(output) ||
          output.includes("✖");

        resolve({
          success: !hasErrors,
          output: output.trim()
        });
      });
    });
  }
}
