import { spawn } from "node:child_process";

export type FlashCliOptions = {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly stdio?: "inherit" | "pipe";
};

export type FlashCliResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

export async function runFlashCli(args: readonly string[], options: FlashCliOptions = {}): Promise<FlashCliResult> {
  const command = flashCommand();
  const result = await run(command, [...args], options);
  if (result.exitCode !== 0) {
    throw new Error(`flash ${args.join(" ")} failed with exit code ${result.exitCode}`);
  }
  return result;
}

export async function checkFlashCli(options: FlashCliOptions = {}): Promise<FlashCliResult> {
  return await run(flashCommand(), ["--help"], { ...options, stdio: "pipe" });
}

function flashCommand(): string {
  return process.env.FLASHPOD_FLASH_BIN || process.env.TS_FLASH_FLASH_BIN || "flash";
}

function run(command: string, args: string[], options: FlashCliOptions): Promise<FlashCliResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: options.stdio === "pipe" ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            [
              `Could not find the Flash CLI (${command}).`,
              "Install it with `uv tool install runpod-flash` or `pip install runpod-flash`,",
              "or set FLASHPOD_FLASH_BIN to the flash executable path.",
            ].join(" "),
          ),
        );
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      resolvePromise({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
