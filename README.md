# Botany MCP

Remote MCP server for authoritative plant information, starting with the public VicFlora GraphQL API.

## What It Exposes

- `search_plants` - search VicFlora taxon concepts by scientific or common name.
- `get_plant_profile` - fetch a VicFlora taxon profile by concept ID or exact-ish name.
- `find_plants_near_point` - fetch VicFlora occurrence context near a coordinate.
- `lookup_botanical_terms` - look up botanical glossary terms from VicFlora.

The server is read-only. Tool responses include provider/source metadata and retrieval timestamps so model answers can stay grounded.
Plant profile image URLs are served through this MCP's `/images/vicflora` proxy so browser clients can render VicFlora CDN images without CORS failures. Original CDN URLs are retained as `thumbnailSourceUrl` and `previewSourceUrl`.

## Quick Start

```bash
npm install
npm run dev
```

The local server defaults to no auth at `http://localhost:3000/mcp`.
When `NODE_ENV=production`, auth is required by default unless `AUTH_REQUIRED=false` is set explicitly.

Set `HOST=0.0.0.0` on hosted platforms that require binding on all interfaces.
On Railway, `PUBLIC_BASE_URL` can be omitted when `RAILWAY_PUBLIC_DOMAIN` is present; the server will derive `https://<RAILWAY_PUBLIC_DOMAIN>`.
The image proxy defaults to VicFlora hosts only; override `IMAGE_PROXY_ALLOWED_HOSTS` with a comma-separated host list if VicFlora changes image CDNs.

```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/.well-known/oauth-protected-resource
```

## Auth

Local development defaults to no auth. For hosted personal use, enable a static bearer token:

```bash
NODE_ENV=production
BOTANY_MCP_TOKEN=generate-a-long-random-token
PUBLIC_BASE_URL=https://your-public-botany-mcp-origin # optional on Railway
```

When auth is enabled, every `/mcp` request must include:

```text
Authorization: Bearer <BOTANY_MCP_TOKEN>
```

The token protects access to the MCP endpoint. Keep it secret, and rotate it if it is exposed.

For clients that require OAuth client credentials, such as Claude custom connectors, configure a built-in OAuth client:

```bash
NODE_ENV=production
OAUTH_CLIENT_ID=botany-mcp
OAUTH_CLIENT_SECRET=generate-another-long-random-secret
PUBLIC_BASE_URL=https://your-public-botany-mcp-origin # optional on Railway
```

Then enter the same `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in the client. The server exposes OAuth discovery at `/.well-known/oauth-authorization-server` and issues short-lived bearer access tokens from `/oauth/token`.

## Useful Scripts

```bash
npm run typecheck
npm test
npm run build
```

## Notes

VicFlora docs: <https://vicflora.rbg.vic.gov.au/api/>

VicFlora GraphQL endpoint: <https://vicflora.rbg.vic.gov.au/graphql>
