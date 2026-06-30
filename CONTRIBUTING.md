# Contributing

This repo is intentionally small.

Run checks:

```bash
npm install
npm run check
```

Keep the first-party boundary clear:

- TypeScript should own the user-facing config, CLI, and client.
- The official Flash CLI should own deploy/build/dev for now.
- Generated Python should stay boring, readable, and easy to delete.
