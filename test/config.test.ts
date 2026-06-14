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
});
