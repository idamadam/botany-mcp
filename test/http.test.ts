import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyImage } from "../src/http.js";

const response = () => {
  const res = {
    headers: {} as Record<string, string | number>,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string | number) {
      this.headers[name.toLowerCase()] = value;
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
    send(body: unknown) {
      this.body = Buffer.isBuffer(body) ? body.toString("utf8") : body;
      return this;
    },
    end() {
      return this;
    }
  };

  return res;
};

describe("proxyImage", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("proxies allowed VicFlora images with cross-origin headers", async () => {
    global.fetch = vi.fn(async () =>
      new Response("fake-image", {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": "10"
        }
      })
    );

    const req = {
      query: {
        url: "https://vicflora-cdn.rbg.vic.gov.au/assets/canto/thumb/example.jpg"
      }
    };
    const res = response();

    await proxyImage(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("fake-image");
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  it("rejects image proxy requests for untrusted hosts", async () => {
    const req = {
      query: {
        url: "https://example.com/image.jpg"
      }
    };
    const res = response();

    await proxyImage(req as never, res as never);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "image_host_not_allowed" });
  });
});
