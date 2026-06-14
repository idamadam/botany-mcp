# Botany MCP

Remote MCP server for authoritative plant information, starting with the public VicFlora GraphQL API.

## What It Exposes

- `search_plants` - search VicFlora taxon concepts by scientific or common name.
- `get_plant_profile` - fetch a VicFlora taxon profile by concept ID or exact-ish name.
- `find_plants_near_point` - fetch VicFlora occurrence context near a coordinate.
- `lookup_botanical_terms` - look up botanical glossary terms from VicFlora.

The server is read-only. Tool responses include provider/source metadata and retrieval timestamps so model answers can stay grounded.

## Quick Start

```bash
npm install
npm run dev
```

The local server defaults to no auth at `http://localhost:3000/mcp`.

Set `HOST=0.0.0.0` on hosted platforms that require binding on all interfaces.

```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/.well-known/oauth-protected-resource
```

## Auth

Local development defaults to no auth. For hosted personal use, enable a static bearer token:

```bash
AUTH_REQUIRED=true
BOTANY_MCP_TOKEN=generate-a-long-random-token
PUBLIC_BASE_URL=https://your-public-botany-mcp-origin
```

When auth is enabled, every `/mcp` request must include:

```text
Authorization: Bearer <BOTANY_MCP_TOKEN>
```

The token protects access to the MCP endpoint. Keep it secret, and rotate it if it is exposed.

## Useful Scripts

```bash
npm run typecheck
npm test
npm run build
```

## Notes

VicFlora docs: <https://vicflora.rbg.vic.gov.au/api/>

VicFlora GraphQL endpoint: <https://vicflora.rbg.vic.gov.au/graphql>
