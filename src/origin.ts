import { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

const defaultAllowedOrigins = () => {
  const origins = new Set<string>([
    "https://chatgpt.com",
    "https://claude.ai",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]);

  try {
    origins.add(new URL(config.publicBaseUrl).origin);
  } catch {
    // Ignore invalid PUBLIC_BASE_URL here; other config paths will surface it.
  }

  for (const origin of config.allowedOrigins) {
    origins.add(origin);
  }

  return origins;
};

export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  if (defaultAllowedOrigins().has(origin)) {
    return next();
  }

  return res.status(403).json({
    error: "origin_not_allowed",
    origin
  });
};
