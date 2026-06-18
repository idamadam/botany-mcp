import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/mcp.js";
import { BotanyProvider, PlantProfile } from "../src/providers/types.js";

const metadata = {
  provider: "VicFlora",
  source: "VicFlora GraphQL API",
  sourceUrl: "https://vicflora.rbg.vic.gov.au/graphql",
  retrievedAt: "2026-06-14T00:00:00.000Z",
  operation: "test"
};

const plantProfile: PlantProfile = {
  taxon: {
    id: "b81ef7c6-89a0-45d7-9b2b-cebb16c7033a",
    scientificName: "Eucalyptus camaldulensis",
    scientificNameWithAuthorship: "Eucalyptus camaldulensis Dehnh.",
    rank: "SPECIES",
    taxonomicStatus: "ACCEPTED",
    occurrenceStatus: "PRESENT",
    establishmentMeans: "NATIVE",
    degreeOfEstablishment: "NATIVE",
    preferredCommonName: "River Red-gum",
    commonNames: ["River Red-gum"],
    sourceUrl: "https://vicflora.rbg.vic.gov.au/flora/taxon/b81ef7c6-89a0-45d7-9b2b-cebb16c7033a"
  },
  profileText: '<p class="description">Tree to 40 m tall.</p><p class="habitat">Along rivers.</p>',
  classification: [],
  synonyms: [],
  phenology: [],
  images: [],
  references: [],
  metadata
};

const provider: BotanyProvider = {
  searchTaxa: async () => ({
    query: "Eucalyptus",
    matches: [],
    metadata: {
        ...metadata,
        operation: "taxonConceptAutocomplete"
      }
    }),
  getTaxonProfile: async () => plantProfile,
  getOccurrences: async () => {
    throw new Error("not used");
  },
  getGlossaryTerms: async () => {
    throw new Error("not used");
  }
};

describe("createMcpServer", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("creates an MCP server instance", () => {
    expect(createMcpServer(provider)).toBeTruthy();
  });

  it("registers the plant learning card app tool and UI resource", async () => {
    const server = createMcpServer(provider);
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    const tools = await client.listTools();
    const appTool = tools.tools.find((tool) => tool.name === "open_plant_learning_card");

    expect(appTool?._meta).toMatchObject({
      ui: {
        resourceUri: "ui://botany/plant-learning-card.html"
      },
      "ui/resourceUri": "ui://botany/plant-learning-card.html"
    });

    const resource = await client.readResource({ uri: "ui://botany/plant-learning-card.html" });
    const resourceContent = resource.contents[0];
    expect(resourceContent).toMatchObject({
      mimeType: "text/html;profile=mcp-app"
    });
    expect("text" in resourceContent ? resourceContent.text : "").toContain("Plant Learning Card");

    await client.close();
    await server.close();
  });

  it("returns structured learning-card fallback content from the app tool", async () => {
    global.fetch = vi.fn(async (url) => {
      const requestUrl = String(url);

      if (requestUrl.includes("bie-ws.ala.org.au")) {
        return new Response(
          JSON.stringify({
            searchResults: {
              results: [
                {
                  idxtype: "TAXON",
                  guid: "https://id.biodiversity.org.au/node/apni/2921040",
                  scientificName: "Eucalyptus camaldulensis",
                  nameComplete: "Eucalyptus camaldulensis Dehnh.",
                  taxonomicStatus: "accepted",
                  commonNameSingle: "Red Gum",
                  commonName: "Red Gum, River Red Gum"
                }
              ]
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          profile: {
            scientificName: "Eucalyptus camaldulensis",
            fullName: "Eucalyptus camaldulensis Dehnh.",
            opusName: "Flora of Australia",
            attributes: [
              {
                title: "Diagnostic Features",
                plainText: "A smooth-barked tree along streams."
              }
            ]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });

    const server = createMcpServer(provider);
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    const result = await client.callTool({
      name: "open_plant_learning_card",
      arguments: { name: "Eucalyptus camaldulensis", region: "VIC" }
    });

    const structuredContent = result.structuredContent as { profile?: unknown } | undefined;
    const content = result.content as Array<{ type: string; text?: string }>;

    expect(structuredContent?.profile).toMatchObject({
      displayName: "River Red-gum",
      scientificName: "Eucalyptus camaldulensis"
    });
    expect(content[0].type).toBe("text");
    expect(content[0].text).toContain("River Red-gum");

    await client.close();
    await server.close();
  });
});
