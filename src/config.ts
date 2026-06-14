import "dotenv/config";

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const withHttps = (value: string) => /^https?:\/\//i.test(value) ? value : `https://${value}`;
const port = toInt(process.env.PORT, 3000);
const nodeEnv = process.env.NODE_ENV ?? "development";
const defaultAuthRequired = nodeEnv === "production";
const publicBaseUrl = () => {
  const explicitBaseUrl = process.env.PUBLIC_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayPublicDomain) {
    return withHttps(railwayPublicDomain);
  }

  return `http://localhost:${port}`;
};

export const config = {
  nodeEnv,
  port,
  host: process.env.HOST ?? "127.0.0.1",
  mcpEndpointPath: process.env.MCP_ENDPOINT_PATH ?? "/mcp",
  publicBaseUrl: trimTrailingSlash(publicBaseUrl()),
  authRequired: toBool(process.env.AUTH_REQUIRED, defaultAuthRequired),
  authToken: process.env.BOTANY_MCP_TOKEN,
  oauthClientId: process.env.OAUTH_CLIENT_ID,
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET,
  oauthAccessTokenTtlSeconds: toInt(process.env.OAUTH_ACCESS_TOKEN_TTL_SECONDS, 3600),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  vicfloraGraphqlEndpoint:
    process.env.VICFLORA_GRAPHQL_ENDPOINT ?? "https://vicflora.rbg.vic.gov.au/graphql",
  vicfloraTimeoutMs: toInt(process.env.VICFLORA_TIMEOUT_MS, 12000),
  vicfloraCacheTtlMs: toInt(process.env.VICFLORA_CACHE_TTL_MS, 300000),
  logLevel: process.env.LOG_LEVEL ?? "info"
};

export const mcpUrl = () => `${config.publicBaseUrl}${config.mcpEndpointPath}`;
