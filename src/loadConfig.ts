import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import type { LoadedConfig, TsFlashConfig } from "./types.js";

const DEFAULT_CONFIG_FILES = [
  "ts-flash.config.ts",
  "ts-flash.config.mts",
  "ts-flash.config.js",
  "ts-flash.config.mjs",
  "ts-flash.config.cjs",
  "ts-flash.config.json",
];

export async function loadConfig(configPath?: string, cwd = process.cwd()): Promise<LoadedConfig> {
  const resolved = configPath ? resolve(cwd, configPath) : findDefaultConfig(cwd);
  if (!resolved) {
    throw new Error(`No ts-flash config found. Expected one of: ${DEFAULT_CONFIG_FILES.join(", ")}`);
  }

  const loaded = await importConfig(resolved);
  const config = normalizeConfigExport(loaded);
  return { path: resolved, config };
}

function findDefaultConfig(cwd: string): string | undefined {
  for (const file of DEFAULT_CONFIG_FILES) {
    const candidate = resolve(cwd, file);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function importConfig(resolved: string): Promise<unknown> {
  if (resolved.endsWith(".json")) {
    const imported = await import(pathToFileURL(resolved).href, { with: { type: "json" } });
    return imported.default;
  }
  if (resolved.endsWith(".ts") || resolved.endsWith(".mts")) {
    const jiti = createJiti(import.meta.url, { interopDefault: true });
    return await jiti.import(resolved, { default: true });
  }
  const imported = await import(pathToFileURL(resolved).href);
  return "default" in imported ? imported.default : imported;
}

function normalizeConfigExport(loaded: unknown): TsFlashConfig {
  const config = loaded && typeof loaded === "object" && "default" in loaded ? (loaded as { default: unknown }).default : loaded;
  if (!config || typeof config !== "object") {
    throw new Error("ts-flash config must export an object.");
  }
  return config as TsFlashConfig;
}
