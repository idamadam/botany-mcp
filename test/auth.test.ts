import { afterEach, describe, expect, it, vi } from "vitest";

const response = () => {
  const res = {
    headers: {} as Record<string, string>,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    redirect(location: string) {
      this.statusCode = 302;
      this.headers.location = location;
      return this;
    }
  };

  return res;
};

describe("protectedResourceMetadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("publishes MCP protected resource details", async () => {
    const { protectedResourceMetadata } = await import("../src/auth.js");
    const metadata = protectedResourceMetadata();

    expect(metadata.resource).toContain("/mcp");
    expect(metadata.bearer_methods_supported).toEqual(["header"]);
  });

  it("publishes OAuth authorization server metadata", async () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://botany.example.com");

    const { authorizationServerMetadata } = await import("../src/auth.js");
    const metadata = authorizationServerMetadata();

    expect(metadata.issuer).toBe("https://botany.example.com");
    expect(metadata.authorization_endpoint).toBe("https://botany.example.com/oauth/authorize");
    expect(metadata.token_endpoint).toBe("https://botany.example.com/oauth/token");
    expect(metadata.grant_types_supported).toContain("client_credentials");
  });

  it("accepts the configured bearer token", async () => {
    vi.stubEnv("AUTH_REQUIRED", "true");
    vi.stubEnv("BOTANY_MCP_TOKEN", "test-token");

    const { requireAuth } = await import("../src/auth.js");
    const req = { headers: { authorization: "Bearer test-token" } };
    const res = response();
    const next = vi.fn();

    await requireAuth(req as never, res as never, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req).toHaveProperty("auth.token", "test-token");
  });

  it("rejects invalid bearer tokens", async () => {
    vi.stubEnv("AUTH_REQUIRED", "true");
    vi.stubEnv("BOTANY_MCP_TOKEN", "test-token");

    const { requireAuth } = await import("../src/auth.js");
    const res = response();
    const next = vi.fn();

    await requireAuth({ headers: { authorization: "Bearer wrong-token" } } as never, res as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "invalid_bearer_token" });
    expect(res.headers["WWW-Authenticate"]).toContain("Bearer");
  });

  it("issues and accepts OAuth client credentials access tokens", async () => {
    vi.stubEnv("AUTH_REQUIRED", "true");
    vi.stubEnv("OAUTH_CLIENT_ID", "claude-client");
    vi.stubEnv("OAUTH_CLIENT_SECRET", "claude-secret");

    const { issueOAuthToken, requireAuth } = await import("../src/auth.js");
    const tokenResponse = response();

    issueOAuthToken(
      {
        headers: {},
        body: {
          grant_type: "client_credentials",
          client_id: "claude-client",
          client_secret: "claude-secret"
        }
      } as never,
      tokenResponse as never
    );

    expect(tokenResponse.statusCode).toBe(200);
    expect(tokenResponse.body).toHaveProperty("access_token");

    const accessToken = (tokenResponse.body as { access_token: string }).access_token;
    const req = { headers: { authorization: `Bearer ${accessToken}` } };
    const res = response();
    const next = vi.fn();

    await requireAuth(req as never, res as never, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
