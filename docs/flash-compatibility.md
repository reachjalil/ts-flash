# Flash Compatibility

`flashpod` follows the official Flash application shape instead of replacing it.

The generated bridge is a normal Python file at the project root, usually
`flash_app.py`. That is deliberate: Flash discovers endpoints by scanning Python
files, importing modules, and inspecting `@Endpoint(...)` decorated functions or
module-level `Endpoint(...)` instances.

The compatibility contract is:

- Generate a root-level Python file before `flash dev`, `flash build`, or
  `flash deploy`.
- Import public symbols from `runpod_flash`, such as `Endpoint`, `GpuType`,
  `GpuGroup`, `CpuInstanceType`, `DataCenter`, `CudaVersion`, and
  `ServerlessScalerType`.
- Emit queue endpoints as `@Endpoint(...) async def ...`.
- Emit load-balanced endpoints as `api = Endpoint(...)` plus
  `@api.get(...)`, `@api.post(...)`, and related route decorators.
- Delegate build, packaging, upload, provisioning, and worker runtime behavior
  to the official `flash` CLI.

The test suite protects this contract in three ways:

- CLI e2e tests generate a real bridge and compile it with Python when
  `python3` is available.
- CI installs `runpod-flash`, generates the example bridge, compiles it, and
  imports it.
- Package smoke tests install the packed npm tarball into a temporary consumer
  project and run `flashpod generate` through the installed binary.

This makes the first version useful without pretending the stable RunPod
deployment logic should be rewritten in a hackathon weekend.
