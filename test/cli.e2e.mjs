import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "..");
const cliPath = join(repoRoot, "dist", "cli.js");

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
  });
}

function tempProject() {
  return mkdtempSync(join(tmpdir(), "flashpod-e2e-"));
}

function writeConfig(projectDir) {
  writeFileSync(
    join(projectDir, "flashpod.config.mjs"),
    `
import { CpuInstanceType, defineConfig, endpoint, handler, route } from ${JSON.stringify(join(repoRoot, "dist", "index.js"))};

export default defineConfig({
  app: "cli-e2e-app",
  bridgeFile: "flash_app.py",
  endpoints: [
    endpoint.queue({
      name: "hello-cli",
      cpu: CpuInstanceType.CPU3C_1_2,
      workers: [0, 1],
      handler: handler.json({ ok: true }),
    }),
    endpoint.loadBalanced({
      name: "api",
      cpu: CpuInstanceType.CPU3C_1_2,
      routes: [route.post("/echo", handler.echo())],
    }),
  ],
});
`,
    "utf8",
  );
}

test("generate writes a Flash-compatible Python bridge", () => {
  const projectDir = tempProject();
  writeConfig(projectDir);

  const result = runNode([cliPath, "generate", "--config", "flashpod.config.mjs"], { cwd: projectDir });

  assert.equal(result.status, 0, result.stderr);
  const bridgePath = join(projectDir, "flash_app.py");
  assert.equal(existsSync(bridgePath), true);
  const bridge = readFileSync(bridgePath, "utf8");
  assert.match(bridge, /from runpod_flash import/);
  assert.match(bridge, /@Endpoint\(name="hello-cli"/);
  assert.match(bridge, /@api\.post\("\/echo"\)/);

  const pyCompile = spawnSync("python3", ["-m", "py_compile", bridgePath], { encoding: "utf8" });
  if (pyCompile.error?.code !== "ENOENT") {
    assert.equal(pyCompile.status, 0, pyCompile.stderr);
  }
});

test("deploy generates bridge then delegates to configured flash binary", () => {
  const projectDir = tempProject();
  writeConfig(projectDir);
  const callsPath = join(projectDir, "flash-calls.json");
  const fakeFlash = join(projectDir, "fake-flash.mjs");
  writeFileSync(
    fakeFlash,
    `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(callsPath)}, JSON.stringify({
  argv: process.argv.slice(2),
  flashApp: process.env.FLASH_APP || null
}, null, 2));
`,
    "utf8",
  );
  chmodSync(fakeFlash, 0o755);

  const result = runNode([cliPath, "deploy", "--config", "flashpod.config.mjs", "--env", "staging"], {
    cwd: projectDir,
    env: { FLASHPOD_FLASH_BIN: fakeFlash },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(join(projectDir, "flash_app.py")), true);
  const call = JSON.parse(readFileSync(callsPath, "utf8"));
  assert.deepEqual(call.argv, ["deploy", "--env", "staging"]);
  assert.equal(call.flashApp, "cli-e2e-app");
});
