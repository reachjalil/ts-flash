import assert from "node:assert/strict";
import test from "node:test";
import {
  CpuInstanceType,
  GpuType,
  defineConfig,
  endpoint,
  generatePythonBridge,
  handler,
  route,
} from "../dist/index.js";

test("generates queue endpoints from TypeScript config", () => {
  const config = defineConfig({
    endpoints: [
      endpoint.queue({
        name: "hello-gpu",
        gpu: GpuType.NVIDIA_GEFORCE_RTX_4090,
        workers: [0, 2],
        dependencies: ["torch"],
        handler: handler.python(`
import torch
return {"gpu": torch.cuda.get_device_name(0), "input": input}
`),
      }),
    ],
  });

  const bridge = generatePythonBridge(config);
  assert.match(bridge, /@Endpoint\(name="hello-gpu", gpu=GpuType\.NVIDIA_GEFORCE_RTX_4090/);
  assert.match(bridge, /workers=\(0, 2\)/);
  assert.match(bridge, /async def hello_gpu\(input=None\):/);
  assert.match(bridge, /return \{"gpu": torch\.cuda\.get_device_name\(0\), "input": input\}/);
});

test("generates load-balanced routes", () => {
  const config = defineConfig({
    endpoints: [
      endpoint.loadBalanced({
        name: "api",
        cpu: CpuInstanceType.CPU3C_4_8,
        workers: [1, 3],
        routes: [route.get("/health", handler.json({ ok: true }))],
      }),
    ],
  });

  const bridge = generatePythonBridge(config);
  assert.match(bridge, /api = Endpoint\(name="api", cpu=CpuInstanceType\.CPU3C_4_8/);
  assert.match(bridge, /@api\.get\("\/health"\)/);
  assert.match(bridge, /return \{"ok": True\}/);
});

test("rejects duplicate endpoint names", () => {
  assert.throws(
    () =>
      generatePythonBridge({
        endpoints: [
          endpoint.queue({ name: "same", handler: handler.echo() }),
          endpoint.queue({ name: "same", handler: handler.echo() }),
        ],
      }),
    /Duplicate endpoint name/,
  );
});
