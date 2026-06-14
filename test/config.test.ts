import { afterEach, describe, expect, it, vi } from "vitest";

const loadConfig = async () => {
  vi.resetModules();
  return (await import("../src/config.js")).config;
};

describe("config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults auth off outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_REQUIRED", undefined);

    const config = await loadConfig();

    expect(config.authRequired).toBe(false);
  });

  it("defaults auth on in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_REQUIRED", undefined);

    const config = await loadConfig();

    expect(config.authRequired).toBe(true);
  });

  it("lets AUTH_REQUIRED explicitly override the environment default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_REQUIRED", "false");

    const config = await loadConfig();

    expect(config.authRequired).toBe(false);
  });

  it("uses RAILWAY_PUBLIC_DOMAIN for the public base URL when no explicit URL is set", async () => {
    vi.stubEnv("PUBLIC_BASE_URL", undefined);
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "botany-production.up.railway.app");

    const config = await loadConfig();

    expect(config.publicBaseUrl).toBe("https://botany-production.up.railway.app");
  });

  it("keeps PUBLIC_BASE_URL as the public base URL override", async () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://botany.example.com/");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "botany-production.up.railway.app");

    const config = await loadConfig();

    expect(config.publicBaseUrl).toBe("https://botany.example.com");
  });
});
