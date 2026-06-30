import { CpuInstanceType, GpuType, defineConfig, endpoint, handler, route } from "flashpod";

export default defineConfig({
  app: "flashpod-demo",
  bridgeFile: "flash_app.py",
  endpoints: [
    endpoint.queue({
      name: "hello-gpu",
      gpu: GpuType.NVIDIA_GEFORCE_RTX_4090,
      workers: [0, 1],
      dependencies: ["torch"],
      handler: handler.python(`
import torch
return {
    "message": "TypeScript configured this endpoint. Python is just the generated adapter.",
    "gpu": torch.cuda.get_device_name(0),
    "input": input,
}
`),
    }),

    endpoint.loadBalanced({
      name: "tiny-api",
      cpu: CpuInstanceType.CPU3C_1_2,
      workers: [0, 2],
      routes: [
        route.get("/health", handler.json({ ok: true })),
        route.post("/echo", handler.echo()),
      ],
    }),
  ],
});
