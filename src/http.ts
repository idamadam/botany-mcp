import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import {
  authChallenge,
  authorizationServerMetadata,
  authorizeOAuth,
  issueOAuthToken,
  protectedResourceMetadata,
  requireAuth
} from "./auth.js";
import { logger } from "./logger.js";
import { createMcpServer } from "./mcp.js";
import { validateOrigin } from "./origin.js";
import { BotanyProvider } from "./providers/types.js";

type TransportMap = Record<string, StreamableHTTPServerTransport>;

export const createHttpApp = (provider: BotanyProvider) => {
  const app = express();
  const transports: TransportMap = {};

  app.use(helmet());
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      name: "botany-mcp",
      authRequired: config.authRequired
    });
  });

  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json(protectedResourceMetadata());
  });

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json(authorizationServerMetadata());
  });

  app.get("/.well-known/openid-configuration", (_req, res) => {
    res.json(authorizationServerMetadata());
  });

  app.get("/oauth/authorize", authorizeOAuth);
  app.post("/oauth/token", issueOAuthToken);

  app.use(config.mcpEndpointPath, validateOrigin);
  app.use(config.mcpEndpointPath, (req, res, next) => {
    if (config.authRequired && !req.headers.authorization) {
      res.setHeader("WWW-Authenticate", authChallenge());
    }
    next();
  });

  const mcpPostHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            transports[newSessionId] = transport;
          }
        });

        transport.onclose = () => {
          const closedSessionId = transport.sessionId;
          if (closedSessionId) {
            delete transports[closedSessionId];
          }
        };

        const mcpServer = createMcpServer(provider);
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: no valid MCP session ID provided."
          },
          id: null
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error({ error }, "Error handling MCP POST request");
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error"
          },
          id: null
        });
      }
    }
  };

  const mcpGetOrDeleteHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing MCP session ID.");
      return;
    }

    try {
      await transports[sessionId].handleRequest(req, res);
    } catch (error) {
      logger.error({ error }, "Error handling MCP session request");
      if (!res.headersSent) {
        res.status(500).send("Error processing MCP request.");
      }
    }
  };

  app.post(config.mcpEndpointPath, requireAuth, mcpPostHandler);
  app.get(config.mcpEndpointPath, requireAuth, mcpGetOrDeleteHandler);
  app.delete(config.mcpEndpointPath, requireAuth, mcpGetOrDeleteHandler);

  const closeTransports = async () => {
    await Promise.allSettled(
      Object.entries(transports).map(async ([sessionId, transport]) => {
        await transport.close();
        delete transports[sessionId];
      })
    );
  };

  return { app, closeTransports };
};
