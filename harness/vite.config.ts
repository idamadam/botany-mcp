import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const appBundle = resolve(process.cwd(), "dist/app/plant-learning-card.html");

const harnessPlugin = (): Plugin => ({
  name: "botany-harness",
  configureServer(server) {
    server.watcher.add(appBundle);
    const notifyAppUpdated = (path: string) => {
      if (resolve(path) === appBundle) {
        server.ws.send({ type: "custom", event: "mcp-app-updated", data: {} });
      }
    };
    server.watcher.on("add", notifyAppUpdated);
    server.watcher.on("change", notifyAppUpdated);

    server.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith("/__app/plant-learning-card.html")) {
        try {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(await readFile(appBundle, "utf8"));
        } catch {
          res.statusCode = 503;
          res.end("Plant Learning Card has not been built. Run npm run build:ui.");
        }
        return;
      }

      if (req.url?.startsWith("/sandbox.html")) {
        res.setHeader(
          "Content-Security-Policy",
          [
            "default-src 'none'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: http://localhost:3000 http://127.0.0.1:3000",
            "font-src 'self' data:",
            "connect-src 'self' ws: http://localhost:3000 http://127.0.0.1:3000",
            "frame-src 'self'",
            "base-uri 'self'"
          ].join("; ")
        );
      }
      next();
    });
  }
});

export default defineConfig({
  root: resolve(process.cwd(), "harness"),
  plugins: [harnessPlugin()],
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [resolve(process.cwd())] }
  }
});
