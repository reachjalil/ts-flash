# Migration Plan

`ts-flash` starts as a TypeScript wrapper around the official Python Flash SDK.
That is intentional: RunPod already solved deployment packaging, endpoint
provisioning, and worker runtime behavior in `runpod-flash`.

The migration path is:

1. Typed TypeScript config that generates a minimal Python bridge.
2. TypeScript endpoint client for queue and load-balanced endpoint calls.
3. Better bridge generators for common model tasks so users write less Python.
4. Optional TypeScript worker runtime for custom images.
5. Native TypeScript deploy implementation if the underlying RunPod APIs settle
   into a stable public contract.

The first version keeps Python as generated glue, not product code. That keeps
the hackathon scope real and lets the official Flash CLI keep owning the hard
deployment mechanics.
