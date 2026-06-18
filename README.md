# Botany MCP

Remote MCP server for authoritative plant information, starting with the public VicFlora GraphQL API.

## What It Exposes

- `search_plants` - search VicFlora taxon concepts by scientific or common name.
- `get_plant_profile` - fetch a VicFlora taxon profile by concept ID or exact-ish name.
- `find_plants_near_point` - fetch VicFlora occurrence context near a coordinate.
- `lookup_botanical_terms` - look up botanical glossary terms from VicFlora.
- `open_plant_learning_card` - open an MCP App learning card for a plant. The card combines VicFlora's Victorian treatment with ALA BIE taxon metadata and ALA Flora of Australia profile attributes. Clients that do not render MCP Apps still receive structured JSON plus text fallback content.

The server is read-only. Tool responses include provider/source metadata and retrieval timestamps so model answers can stay grounded.
Plant profile image URLs are served through this MCP's `/images/vicflora` proxy so browser clients can render VicFlora CDN images without CORS failures. Original CDN URLs are retained as `thumbnailSourceUrl` and `previewSourceUrl`.
The learning card also uses the same image proxy for trusted ALA image hosts.

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

## MCP App Development

The Plant Learning Card is bundled as a standards-first MCP App resource at:

```text
ui://botany/plant-learning-card.html
```

For interactive design without Claude, run the local UI preview harness:

```bash
npm run dev:ui
```

Then open:

```text
http://127.0.0.1:5173/plant-learning-card.html?preview=1
```

Preview mode uses bundled sample profile data so the tabs are clickable in a normal browser. In Claude or another MCP Apps host, the same UI uses the MCP Apps bridge and renders the `open_plant_learning_card` result for live data.

### Chat context harness

To iterate on the card inside a model-free conversation shell, run:

```bash
npm run dev:harness
```

Open `http://localhost:5174`. The harness provides authored user and assistant messages, fixture-backed tool results, light/dark and narrow/wide host controls, and developer traces around the real sandboxed MCP App. UI changes rebuild and remount the current card without clearing the conversation.

Fixture mode is deterministic and does not require network access. Enable **Live MCP** in the toolbar to invoke the local server at `http://localhost:3000/mcp`. The original standalone preview remains available for isolated card work.

The card UI uses vendored [Oat](https://oat.ink/) assets from `ui/vendor` for lightweight semantic controls, then Vite inlines them into the single MCP App HTML resource.

Build the UI before running a production build:

```bash
npm run build:ui
npm run build
```

`npm run build` runs the UI bundle first, then compiles the MCP server.

For local Claude testing, expose the local server with a tunnel such as Cloudflare Tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Then add the generated HTTPS URL as a Claude custom connector, using the `/mcp` endpoint. Claude custom connectors are available on supported paid Claude plans. The server already supports OAuth client credentials for hosted connector use.

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
npm run build:ui
npm run build:server
npm run typecheck
npm test
npm run build
```

## Notes

VicFlora docs: <https://vicflora.rbg.vic.gov.au/api/>

VicFlora GraphQL endpoint: <https://vicflora.rbg.vic.gov.au/graphql>
