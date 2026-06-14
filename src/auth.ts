import { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { config, mcpUrl } from "./config.js";

type AuthInfo = {
  token: string;
};

export type AuthedRequest = Request & {
  auth?: AuthInfo;
};

const resourceMetadataUrl = () => `${config.publicBaseUrl}/.well-known/oauth-protected-resource`;

export const protectedResourceMetadata = () => ({
  resource: mcpUrl(),
  bearer_methods_supported: ["header"],
  resource_documentation: "https://github.com/idam/botany-mcp#readme"
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

export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!config.authRequired) {
    return next();
  }

  if (!config.authToken) {
    return res.status(500).json({
      error: "auth_not_configured",
      message: "AUTH_REQUIRED=true requires BOTANY_MCP_TOKEN."
    });
  }

  const header = req.headers.authorization;
  const match = header?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.setHeader("WWW-Authenticate", authChallenge());
    return res.status(401).json({ error: "missing_bearer_token" });
  }

  if (!tokenMatches(match[1], config.authToken)) {
    res.setHeader("WWW-Authenticate", authChallenge());
    return res.status(401).json({ error: "invalid_bearer_token" });
  }

  req.auth = {
    token: match[1]
  };

  return next();
};
