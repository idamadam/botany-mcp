import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { NextFunction, Request, Response } from "express";
import { config, mcpUrl } from "./config.js";

type AuthInfo = {
  token: string;
  subject?: string;
  clientId?: string;
  scopes: string[];
  payload: JWTPayload;
};

export type AuthedRequest = Request & {
  auth?: AuthInfo;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const normalizeIssuer = (issuer: string) => (issuer.endsWith("/") ? issuer : `${issuer}/`);

const resourceMetadataUrl = () => `${config.publicBaseUrl}/.well-known/oauth-protected-resource`;

export const protectedResourceMetadata = () => ({
  resource: mcpUrl(),
  authorization_servers: config.auth0IssuerBaseUrl ? [normalizeIssuer(config.auth0IssuerBaseUrl)] : [],
  scopes_supported: config.authRequiredScopes,
  bearer_methods_supported: ["header"],
  resource_documentation: "https://github.com/idam/botany-mcp#readme"
});

export const authChallenge = () =>
  `Bearer resource_metadata="${resourceMetadataUrl()}", scope="${config.authRequiredScopes.join(" ")}"`;

export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!config.authRequired) {
    return next();
  }

  if (!config.auth0IssuerBaseUrl || !config.auth0Audience) {
    return res.status(500).json({
      error: "auth_not_configured",
      message: "AUTH_REQUIRED=true requires AUTH0_ISSUER_BASE_URL and AUTH0_AUDIENCE."
    });
  }

  const header = req.headers.authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.setHeader("WWW-Authenticate", authChallenge());
    return res.status(401).json({ error: "missing_bearer_token" });
  }

  try {
    const issuer = normalizeIssuer(config.auth0IssuerBaseUrl);
    jwks ??= createRemoteJWKSet(new URL(".well-known/jwks.json", issuer));

    const { payload } = await jwtVerify(match[1], jwks, {
      issuer,
      audience: config.auth0Audience
    });

    const scopes = typeof payload.scope === "string" ? payload.scope.split(/\s+/).filter(Boolean) : [];
    const missingScopes = config.authRequiredScopes.filter((scope) => !scopes.includes(scope));

    if (missingScopes.length > 0) {
      res.setHeader("WWW-Authenticate", authChallenge());
      return res.status(403).json({
        error: "insufficient_scope",
        missingScopes
      });
    }

    req.auth = {
      token: match[1],
      subject: payload.sub,
      clientId: typeof payload.azp === "string" ? payload.azp : undefined,
      scopes,
      payload
    };

    return next();
  } catch (error) {
    res.setHeader("WWW-Authenticate", authChallenge());
    return res.status(401).json({
      error: "invalid_bearer_token",
      message: error instanceof Error ? error.message : String(error)
    });
  }
};
