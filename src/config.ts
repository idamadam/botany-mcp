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
const port = toInt(process.env.PORT, 3000);

export const config = {
  port,
  host: process.env.HOST ?? "127.0.0.1",
  mcpEndpointPath: process.env.MCP_ENDPOINT_PATH ?? "/mcp",
  publicBaseUrl: trimTrailingSlash(process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`),
  authRequired: toBool(process.env.AUTH_REQUIRED, false),
  authToken: process.env.BOTANY_MCP_TOKEN,
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
