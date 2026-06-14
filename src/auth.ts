import { NextFunction, Request, Response } from "express";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { config, mcpUrl } from "./config.js";

type AuthInfo = {
  token: string;
};

export type AuthedRequest = Request & {
  auth?: AuthInfo;
};

type AuthorizationCode = {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
  expiresAt: number;
};

type AccessToken = {
  clientId: string;
  resource?: string;
  expiresAt: number;
};

const authorizationCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, AccessToken>();

const resourceMetadataUrl = () => `${config.publicBaseUrl}/.well-known/oauth-protected-resource`;
const oauthEnabled = () => Boolean(config.oauthClientId && config.oauthClientSecret);

export const protectedResourceMetadata = () => ({
  resource: mcpUrl(),
  ...(config.authRequired && oauthEnabled() ? { authorization_servers: [config.publicBaseUrl] } : {}),
  scopes_supported: ["plants:read"],
  bearer_methods_supported: ["header"],
  resource_documentation: "https://github.com/idamadam/botany-mcp#readme"
});

export const authorizationServerMetadata = () => ({
  issuer: config.publicBaseUrl,
  authorization_endpoint: `${config.publicBaseUrl}/oauth/authorize`,
  token_endpoint: `${config.publicBaseUrl}/oauth/token`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "client_credentials"],
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
  code_challenge_methods_supported: ["S256", "plain"],
  scopes_supported: ["plants:read"]
});

export const authChallenge = () =>
  `Bearer realm="Botany MCP", resource_metadata="${resourceMetadataUrl()}"`;

const tokenMatches = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

const createOpaqueToken = () => randomBytes(32).toString("base64url");

const createAccessToken = (clientId: string, resource?: string) => {
  const token = createOpaqueToken();
  accessTokens.set(token, {
    clientId,
    resource,
    expiresAt: Date.now() + config.oauthAccessTokenTtlSeconds * 1000
  });
  return token;
};

const oauthTokenMatches = (token: string) => {
  const accessToken = accessTokens.get(token);
  if (!accessToken) {
    return false;
  }

  if (Date.now() > accessToken.expiresAt) {
    accessTokens.delete(token);
    return false;
  }

  return !accessToken.resource || accessToken.resource === mcpUrl() || accessToken.resource === config.publicBaseUrl;
};

const firstString = (value: unknown) => Array.isArray(value) ? value[0] : value;

const getBasicClientCredentials = (req: Request) => {
  const header = req.headers.authorization;
  const match = header?.match(/^Basic\s+(.+)$/i);
  if (!match) {
    return {};
  }

  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return {};
  }

  return {
    clientId: decoded.slice(0, separator),
    clientSecret: decoded.slice(separator + 1)
  };
};

const getClientCredentials = (req: Request) => {
  const basic = getBasicClientCredentials(req);
  return {
    clientId: basic.clientId ?? firstString(req.body?.client_id),
    clientSecret: basic.clientSecret ?? firstString(req.body?.client_secret)
  };
};

const validOAuthClient = (clientId: unknown, clientSecret: unknown) => {
  if (
    typeof clientId !== "string" ||
    typeof clientSecret !== "string" ||
    !config.oauthClientId ||
    !config.oauthClientSecret
  ) {
    return false;
  }

  return tokenMatches(clientId, config.oauthClientId) &&
    tokenMatches(clientSecret, config.oauthClientSecret);
};

const pkceMatches = (verifier: unknown, challenge?: string, method?: string) => {
  if (!challenge) {
    return true;
  }

  if (typeof verifier !== "string") {
    return false;
  }

  if ((method ?? "plain") === "plain") {
    return verifier === challenge;
  }

  if (method === "S256") {
    const digest = createHash("sha256").update(verifier).digest("base64url");
    return digest === challenge;
  }

  return false;
};

const accessTokenResponse = (accessToken: string) => ({
  access_token: accessToken,
  token_type: "Bearer",
  expires_in: config.oauthAccessTokenTtlSeconds,
  scope: "plants:read"
});

export const authorizeOAuth = (req: Request, res: Response) => {
  if (!oauthEnabled()) {
    return res.status(404).json({ error: "oauth_not_configured" });
  }

  const responseType = firstString(req.query.response_type);
  const clientId = firstString(req.query.client_id);
  const redirectUri = firstString(req.query.redirect_uri);
  const state = firstString(req.query.state);
  const codeChallenge = firstString(req.query.code_challenge);
  const codeChallengeMethod = firstString(req.query.code_challenge_method);
  const resource = firstString(req.query.resource);

  if (responseType !== "code") {
    return res.status(400).json({ error: "unsupported_response_type" });
  }

  if (clientId !== config.oauthClientId || typeof redirectUri !== "string") {
    return res.status(400).json({ error: "invalid_request" });
  }

  const code = createOpaqueToken();
  authorizationCodes.set(code, {
    clientId,
    redirectUri,
    codeChallenge: typeof codeChallenge === "string" ? codeChallenge : undefined,
    codeChallengeMethod: typeof codeChallengeMethod === "string" ? codeChallengeMethod : undefined,
    resource: typeof resource === "string" ? resource : undefined,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (typeof state === "string") {
    redirectUrl.searchParams.set("state", state);
  }

  return res.redirect(redirectUrl.toString());
};

export const issueOAuthToken = (req: Request, res: Response) => {
  if (!oauthEnabled()) {
    return res.status(404).json({ error: "oauth_not_configured" });
  }

  const { clientId, clientSecret } = getClientCredentials(req);
  if (!validOAuthClient(clientId, clientSecret)) {
    return res.status(401).json({ error: "invalid_client" });
  }

  const grantType = firstString(req.body?.grant_type);
  const resource = firstString(req.body?.resource);

  if (grantType === "client_credentials") {
    return res.json(accessTokenResponse(createAccessToken(clientId, typeof resource === "string" ? resource : undefined)));
  }

  if (grantType === "authorization_code") {
    const code = firstString(req.body?.code);
    const redirectUri = firstString(req.body?.redirect_uri);

    if (typeof code !== "string" || typeof redirectUri !== "string") {
      return res.status(400).json({ error: "invalid_request" });
    }

    const authorizationCode = authorizationCodes.get(code);
    authorizationCodes.delete(code);

    if (
      !authorizationCode ||
      authorizationCode.clientId !== clientId ||
      authorizationCode.redirectUri !== redirectUri ||
      Date.now() > authorizationCode.expiresAt ||
      !pkceMatches(req.body?.code_verifier, authorizationCode.codeChallenge, authorizationCode.codeChallengeMethod)
    ) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    return res.json(accessTokenResponse(createAccessToken(clientId, authorizationCode.resource)));
  }

  return res.status(400).json({ error: "unsupported_grant_type" });
};

export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!config.authRequired) {
    return next();
  }

  if (!config.authToken && !oauthEnabled()) {
    return res.status(500).json({
      error: "auth_not_configured",
      message: "AUTH_REQUIRED=true requires BOTANY_MCP_TOKEN or OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET."
    });
  }

  const header = req.headers.authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.setHeader("WWW-Authenticate", authChallenge());
    return res.status(401).json({ error: "missing_bearer_token" });
  }

  const validStaticToken = config.authToken ? tokenMatches(match[1], config.authToken) : false;
  if (!validStaticToken && !oauthTokenMatches(match[1])) {
    res.setHeader("WWW-Authenticate", authChallenge());
    return res.status(401).json({ error: "invalid_bearer_token" });
  }

  req.auth = {
    token: match[1]
  };

  return next();
};
