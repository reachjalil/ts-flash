#!/usr/bin/env node
import { existsSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { generatePythonBridge } from "./generate.js";
import { checkFlashCli, runFlashCli } from "./flashCli.js";
import { loadConfig } from "./loadConfig.js";

type ParsedArgs = {
  readonly command: string | undefined;
  readonly passthrough: string[];
  readonly flags: Map<string, string | boolean>;
};

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed.command ?? "help";

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    initConfig(parsed);
    return;
  }

  if (command === "doctor") {
    await doctor();
    return;
  }

  if (command === "login") {
    await runFlashCli(["login", ...parsed.passthrough]);
    return;
  }

  if (command === "generate") {
    await generate(parsed);
    return;
  }

  if (command === "dev" || command === "build" || command === "deploy") {
    const config = await generate(parsed);
    const flashArgs = [command, ...parsed.passthrough];
    if (config.config.app && !hasFlag(parsed.passthrough, "--app")) {
      process.env.FLASH_APP ??= config.config.app;
    }
    await runFlashCli(flashArgs);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function generate(parsed: ParsedArgs) {
  const configPath = stringFlag(parsed, "--config");
  const loaded = await loadConfig(configPath);
  const bridgeFile = stringFlag(parsed, "--out") ?? loaded.config.bridgeFile ?? "flash_app.py";
  const outPath = resolve(process.cwd(), bridgeFile);
  const source = generatePythonBridge(loaded.config);

  if (parsed.flags.has("--dry-run")) {
    process.stdout.write(source);
  } else {
    writeFileSync(outPath, source, "utf8");
    console.log(`Generated ${basename(outPath)} from ${basename(loaded.path)}.`);
  }
  return loaded;
}

function initConfig(parsed: ParsedArgs): void {
  const out = stringFlag(parsed, "--out") ?? "ts-flash.config.ts";
  const path = resolve(process.cwd(), out);
  if (existsSync(path) && !parsed.flags.has("--force")) {
    throw new Error(`${out} already exists. Re-run with --force to overwrite.`);
  }
  writeFileSync(path, starterConfig(), "utf8");
  console.log(`Created ${out}.`);
}

async function doctor(): Promise<void> {
  console.log("ts-flash doctor");
  console.log(`cwd: ${process.cwd()}`);
  console.log(`RUNPOD_API_KEY: ${process.env.RUNPOD_API_KEY ? "set" : "missing"}`);
  try {
    const result = await checkFlashCli();
    console.log(`flash cli: ok (${firstLine(result.stdout || result.stderr) || "available"})`);
  } catch (error) {
    console.log(`flash cli: missing`);
    console.log(error instanceof Error ? error.message : String(error));
  }
}

function parseArgs(args: string[]): ParsedArgs {
  const [command, ...rest] = args;
  const passthrough: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value?.startsWith("--")) {
      passthrough.push(value ?? "");
      continue;
    }
    if (value.includes("=")) {
      const [key, raw] = value.split(/=(.*)/s, 2);
      flags.set(key ?? value, raw ?? "");
      continue;
    }
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(value, next);
      index += 1;
    } else {
      flags.set(value, true);
    }
  }

  for (const [key, value] of flags) {
    if (!["--config", "--out", "--dry-run", "--force"].includes(key)) {
      passthrough.push(value === true ? key : `${key}=${value}`);
    }
  }

  return { command, flags, passthrough };
}

function stringFlag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function hasFlag(args: readonly string[], name: string): boolean {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function firstLine(value: string): string {
  return value.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "";
}

function printHelp(): void {
  console.log(`ts-flash

TypeScript-first wrapper for RunPod Flash.

Usage:
  ts-flash init [--out ts-flash.config.ts]
  ts-flash generate [--config ts-flash.config.ts] [--out flash_app.py] [--dry-run]
  ts-flash dev [flash args...]
  ts-flash build [flash args...]
  ts-flash deploy [flash args...]
  ts-flash login
  ts-flash doctor

Notes:
  - dev/build/deploy generate the Python bridge first, then call the official flash CLI.
  - install Flash with: uv tool install runpod-flash
  - set TS_FLASH_FLASH_BIN if your flash executable is not on PATH.
`);
}

function starterConfig(): string {
  return `import { CpuInstanceType, defineConfig, endpoint, handler } from "ts-flash";

export default defineConfig({
  app: "${basename(process.cwd()) || "ts-flash-app"}",
  bridgeFile: "flash_app.py",
  endpoints: [
    endpoint.queue({
      name: "hello-ts-flash",
      cpu: CpuInstanceType.CPU3C_1_2,
      workers: [0, 1],
      handler: handler.json({
        ok: true,
        message: "Hello from generated Flash glue. Python has been politely abstracted.",
      }),
    }),
  ],
});
`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
