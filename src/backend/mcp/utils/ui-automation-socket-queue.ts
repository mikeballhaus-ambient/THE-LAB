/** Serialize UI automation socket discover/action MCP calls (rm-46 **2.23**). */
let chain: Promise<unknown> = Promise.resolve();

export function runUiAutomationSocketExclusive<T>(work: () => Promise<T>): Promise<T> {
  const next = chain.then(work, work);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
