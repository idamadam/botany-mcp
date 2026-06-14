import { describe, expect, it } from "vitest";
import { protectedResourceMetadata } from "../src/auth.js";

describe("protectedResourceMetadata", () => {
  it("publishes MCP protected resource details", () => {
    const metadata = protectedResourceMetadata();

    expect(metadata.resource).toContain("/mcp");
    expect(metadata.scopes_supported).toContain("plants:read");
    expect(metadata.bearer_methods_supported).toEqual(["header"]);
  });
});
