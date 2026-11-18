export interface TypeCheckVaildatorResult {
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

export class TypeCheckVaildator {
  static run(file: string): Promise<TypeCheckVaildatorResult> {
    return new Promise((resolve) => {
      const cwd = process.cwd()
      const child = serverSpawn("node", ["scripts/type-check-file.js", file], {
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
        const success = output.includes("No TypeScript errors");
        resolve({ success, output: output.trim() });
      });
    });
  }
}
