import { describe, expect, it, vi } from "vitest";
import { validateOrigin } from "../src/origin.js";

const response = () => ({
  statusCode: 200,
  body: undefined as unknown,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(body: unknown) {
    this.body = body;
    return this;
  }
});

describe("validateOrigin", () => {
  it("accepts the local chat harness origins", () => {
    for (const origin of ["http://localhost:5174", "http://127.0.0.1:5174"]) {
      const next = vi.fn();
      validateOrigin({ headers: { origin } } as never, response() as never, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("continues rejecting unknown origins", () => {
    const res = response();
    validateOrigin(
      { headers: { origin: "https://untrusted.example" } } as never,
      res as never,
      vi.fn()
    );
    expect(res.statusCode).toBe(403);
  });
});
