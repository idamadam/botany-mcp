import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/mcp.js";
import { BotanyProvider } from "../src/providers/types.js";

const provider: BotanyProvider = {
  searchTaxa: async () => ({
    query: "Eucalyptus",
    matches: [],
    metadata: {
      provider: "VicFlora",
      source: "VicFlora GraphQL API",
      sourceUrl: "https://vicflora.rbg.vic.gov.au/graphql",
      retrievedAt: "2026-06-14T00:00:00.000Z",
      operation: "taxonConceptAutocomplete"
    }
  }),
  getTaxonProfile: async () => {
    throw new Error("not used");
  },
  getOccurrences: async () => {
    throw new Error("not used");
  },
  getGlossaryTerms: async () => {
    throw new Error("not used");
  }
};

describe("createMcpServer", () => {
  it("creates an MCP server instance", () => {
    expect(createMcpServer(provider)).toBeTruthy();
  });
});
