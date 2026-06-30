# ts-flash

TypeScript-first wrapper for [RunPod Flash](https://github.com/runpod/flash).

This is a small hackathon-friendly package with a practical joke inside: the
best Python is the Python your TypeScript generated for you.

`ts-flash` lets you define Flash endpoints in TypeScript, generate the tiny
Python bridge that the official Flash builder expects, and then call
`flash dev`, `flash build`, or `flash deploy` from the same CLI.

It is not an official RunPod package.

## What works now

- Typed endpoint config in `ts-flash.config.ts`
- Generated `flash_app.py` bridge for queue and load-balanced endpoints
- CLI lifecycle wrapper around the official `flash` command
- TypeScript client for RunPod queue and load-balanced endpoint calls
- npm-ready package named `ts-flash`

## Install

```bash
npm install ts-flash
uv tool install runpod-flash
```

Flash still needs its official Python CLI installed locally because this first
version delegates deployment to `runpod-flash`.

## Quickstart

```bash
npx ts-flash init
npx ts-flash generate
npx ts-flash deploy --env production
```

Example config:

```ts
import { CpuInstanceType, defineConfig, endpoint, handler, route } from "ts-flash";

export default defineConfig({
  app: "hello-ts-flash",
  bridgeFile: "flash_app.py",
  endpoints: [
    endpoint.queue({
      name: "hello",
      cpu: CpuInstanceType.CPU3C_1_2,
      workers: [0, 1],
      handler: handler.json({
        ok: true,
        message: "Configured in TypeScript. Deployed by Flash.",
      }),
    }),

    endpoint.loadBalanced({
      name: "api",
      cpu: CpuInstanceType.CPU3C_1_2,
      workers: [0, 2],
      routes: [
        route.get("/health", handler.json({ ok: true })),
        route.post("/echo", handler.echo()),
      ],
    }),
  ],
});
```

Generated bridge:

```bash
npx ts-flash generate --dry-run
```

## Calling endpoints from TypeScript

```ts
import { FlashClient } from "ts-flash";

const client = new FlashClient({ apiKey: process.env.RUNPOD_API_KEY });
const endpoint = client.endpoint("YOUR_ENDPOINT_ID");

const job = await endpoint.runsync<{ prompt: string }, { text: string }>({
  prompt: "hello",
});

console.log(job.output);
```

## CLI

```bash
ts-flash init
ts-flash generate [--config ts-flash.config.ts] [--out flash_app.py]
ts-flash dev [flash args...]
ts-flash build [flash args...]
ts-flash deploy [flash args...]
ts-flash login
ts-flash doctor
```

`dev`, `build`, and `deploy` generate the bridge first, then run the official
Flash CLI.

## Scope

This package deliberately starts as a wrapper. It follows the same boundary I
use in production TypeScript/Python projects:

- TypeScript owns config, orchestration, UX, and typed clients.
- Flash owns deployment packaging and RunPod provisioning.
- Python exists as generated bridge code until a real TypeScript worker runtime
  is worth building.

See [docs/migration-plan.md](docs/migration-plan.md).

## Publishing

```bash
npm run check
npm publish
```

## License

MIT
