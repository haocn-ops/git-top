# Security

Please report security issues privately by emailing the maintainer listed on the GitHub repository profile, or by opening a private security advisory on GitHub when available.

Do not publish tokens, API keys, private repository data, or reproduction steps that expose credentials in public issues.

## Supported Deployment

The supported production surface is the Cloudflare Worker deployment configured by `wrangler.toml`.

Required production secrets are:

- `GITHUB_TOKEN`
- `SYNC_SECRET`

Local development secrets belong in `.dev.vars`, which is intentionally ignored by git.
