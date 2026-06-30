#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const pack = spawnSync("npm", ["pack", "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
});
assert.equal(pack.status, 0, pack.stderr);
const packed = JSON.parse(pack.stdout)[0];
const tarball = join(repoRoot, packed.filename);

const expected = new Set(["dist/index.js", "dist/cli.js", "README.md", "LICENSE", "docs/migration-plan.md"]);
for (const file of expected) {
  assert.equal(
    packed.files.some((entry) => entry.path === file),
    true,
    `expected package tarball to include ${file}`,
  );
}

const projectDir = mkdtempSync(join(tmpdir(), "flashpod-package-"));
writeFileSync(
  join(projectDir, "package.json"),
  JSON.stringify({ name: "consumer", type: "module", private: true }, null, 2),
);

const install = spawnSync("npm", ["install", "--ignore-scripts", tarball], {
  cwd: projectDir,
  encoding: "utf8",
});
assert.equal(install.status, 0, install.stderr);

writeFileSync(
  join(projectDir, "flashpod.config.mjs"),
  `import { CpuInstanceType, defineConfig, endpoint, handler } from "flashpod";

export default defineConfig({
  endpoints: [
    endpoint.queue({
      name: "package-smoke",
      cpu: CpuInstanceType.CPU3C_1_2,
      handler: handler.json({ ok: true }),
    }),
  ],
});
`,
  "utf8",
);

const generate = spawnSync(process.execPath, ["node_modules/.bin/flashpod", "generate", "--dry-run"], {
  cwd: projectDir,
  encoding: "utf8",
});
assert.equal(generate.status, 0, generate.stderr);
assert.match(generate.stdout, /@Endpoint\(name="package-smoke"/);

const cliSource = readFileSync(join(projectDir, "node_modules", "flashpod", "dist", "cli.js"), "utf8");
assert.match(cliSource, /TypeScript-first wrapper/);

console.log(`package smoke ok: ${packed.filename}`);
