#!/usr/bin/env node
import { config } from "./config.js";
import { createHttpApp } from "./http.js";
import { logger } from "./logger.js";
import { VicFloraProvider } from "./providers/vicflora.js";

const provider = new VicFloraProvider();
const { app, closeTransports } = createHttpApp(provider);

const server = app.listen(config.port, config.host, () => {
  logger.info(
    {
      port: config.port,
      host: config.host,
      endpoint: config.mcpEndpointPath,
      authRequired: config.authRequired
    },
    "Botany MCP listening"
  );
});

const shutdown = async () => {
  logger.info("Shutting down Botany MCP");
  await closeTransports();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
