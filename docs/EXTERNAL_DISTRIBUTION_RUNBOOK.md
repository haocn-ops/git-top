# External Distribution Runbook

Git.Top prepares external listing artifacts locally but does not mark a channel live until an authorized publisher submits it and verifies the resulting listing.

## Canonical MCP Registry

The official Registry artifact is `distribution/server.json`. It follows the current remote-server `server.json` format and declares:

- server name: `io.github.haocn-ops/git-top`;
- remote transport: Streamable HTTP;
- default endpoint: `https://git.top/mcp/core`;
- authentication: none;
- repository: `https://github.com/haocn-ops/git-top`;
- attributed connection page: `https://git.top/connect?source=mcp-registry`.

The core endpoint is the only Registry remote because it is the canonical first-use surface. The full 21-tool endpoint remains discoverable from `/connect`, `/mcp`, and the distribution package.

## Pre-Publish Gate

Run these checks before authenticating or publishing:

```sh
pnpm distribution:validate
pnpm compatibility:validate
mcp-publisher validate distribution/server.json
pnpm smoke:prod
```

The Registry validation command is read-only: it sends the artifact to the official validation endpoint but does not authenticate or publish it. On 2026-07-31, `distribution/server.json` passed this check with `mcp-publisher` 1.8.0.

Confirm that:

- `distribution/server.json` still matches the official Registry schema URL and repository version;
- the production core endpoint initializes and advertises exactly five tools;
- `/api/compatibility` reports only clients with complete dated evidence as supported;
- `/api/trust` returns D1 provenance and an acceptable Trust Gate decision;
- the distribution package still reports an unpublished target channel as `prepared_not_submitted`, or records the exact existing-submission evidence when a catalog rejects a duplicate endpoint.

## Authorized Publish Flow

Publishing creates an external listing and requires publisher authorization. An authorized maintainer should:

1. Install the official `mcp-publisher` from the MCP Registry project.
2. Authenticate with GitHub using `mcp-publisher login github` as an identity authorized for the `haocn-ops` namespace.
3. Run `mcp-publisher publish` from the repository root, using `distribution/server.json` if the installed publisher supports an explicit file argument; otherwise place the validated artifact at the path required by that publisher version.
4. Query the Registry API for `io.github.haocn-ops/git-top` and confirm the active version, core endpoint, repository, and connection-page URL.
5. Run the verification prompt from a Registry-installed client and preserve D1 source, evidence, and caveats.
6. Only then change the canonical Registry submission status from `prepared_not_submitted` to a dated live status.

Do not automate the interactive login or publication step from an untrusted environment. Do not add API keys, cookies, prompts, tool arguments, results, or repository selections to listing metadata.

## Other Channels

Third-party catalogs and client directories should reuse `distribution/git-top-agent-distribution.json`, not maintain divergent product copy. Every listing must point to `/connect` with an explicit campaign source and record its submission date, listing URL, last audit date, and verification outcome before it is called live.

The selected next channels are:

- Smithery, using its documented hosted-server URL flow with `https://git.top/mcp/core` and `https://git.top/connect?source=smithery`;
- Glama, using its remote connector flow with the same core endpoint and `https://git.top/connect?source=glama`.

Before submitting either channel, rerun the pre-publish gate, confirm the catalog still supports remote Streamable HTTP, and search for an existing Git.Top record to avoid duplicates. After submission, record the exact listing URL and external status in the distribution package, run the verification prompt through the listed endpoint, and only then mark that individual channel live. Use `partial_live` for the aggregate `third_party_catalogs` status while only one selected catalog has passed this audit, and `live` once both selected catalogs pass.

The canonical MCP Registry record `io.github.haocn-ops/git-top` version `0.1.0` was published on 2026-07-31 and independently read back from the Registry API with status `active`, `isLatest=true`, and the expected core endpoint, repository, and connection-page URL.

Smithery was published at `https://smithery.ai/servers/izhenghaocn/git-top` on 2026-07-31. Its deployment probe returned `SUCCESS`, discovered the expected five core tools, and reported `git-top` version `0.1.0`; the channel is `live`.

Glama's initial Remote Connector submission returned `A server with this URL already exists.`. Safari verification on 2026-08-01 found the public connector at `https://glama.ai/mcp/connectors/io.github.haocn-ops/git-top` and the server listing at `https://glama.ai/mcp/servers/haocn-ops/git-top`; its status was `Healthy`, transport `Streamable HTTP`, endpoint `https://git.top/mcp/core`, and five tools. Glama is now `live`, and the aggregate third-party catalog state is `live`. Client directories remain `prepared_not_submitted`. The three-maintained-channel acceptance criterion is complete for the official MCP Registry, Smithery, and Glama. Worker version `b9b868d8-86fb-4a79-9ec7-9956940f5e96` exposes the confirmed Glama listing state in production, and the full production smoke suite passed.

The installable Skill was published separately to the repository `main` branch in commit `0fefc63`; its raw GitHub URL returned HTTP 200 on 2026-08-01. Keep later product release tags separate from this focused Skill publication until the remaining working-tree changes are reviewed and consolidated.
