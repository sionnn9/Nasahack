import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The ground credential must never be compiled into the crew bundle. This test
 * walks the app source and fails if the key is referenced from client code.
 */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "public"].includes(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      sourceFiles(path, found);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) found.push(path);
  }
  return found;
}

describe("ground credential exposure", () => {
  it("does not reference a public ground key anywhere in the app source", () => {
    const root = process.cwd();
    // Only the directories that are bundled for the browser. The e2e harness
    // lives in e2e/ and is never shipped to a client.
    const bundled = ["app", "components", "lib"].flatMap((dir) =>
      sourceFiles(join(root, dir)),
    );
    const hits = bundled
      .filter((path) => !path.endsWith("ground-key.test.ts"))
      .filter((path) => {
        const text = readFileSync(path, "utf8");
        return (
          text.includes("NEXT_PUBLIC_GROUND_KEY") ||
          text.includes("ground-demo-key")
        );
      })
      .map((path) => relative(root, path));
    expect(hits).toEqual([]);
  });
});
