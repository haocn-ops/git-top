# Contributing

Git.Top is an agent-native open-source knowledge graph. Contributions should improve project knowledge quality, API reliability, Worker pages, evaluation coverage, or documentation.

## Local Setup

```sh
pnpm install
pnpm db:execute
pnpm db:seed
pnpm validate
```

Use `pnpm dev` to run the Cloudflare Worker locally.

## Before Opening a Pull Request

Run the focused checks that match your change:

```sh
pnpm check
pnpm core:validate
pnpm api:validate
pnpm mcp:validate
pnpm docs:validate
```

For release-sensitive changes, run:

```sh
pnpm release:check
```

## Data Changes

Seed and generated knowledge changes should keep evaluation drift explicit. Run:

```sh
pnpm knowledge:validate
pnpm eval:fixtures
pnpm eval:quality
```

Do not commit `.dev.vars`, real API tokens, or production secrets.
