import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { config } from "./config.js";
import { PlantLearningService } from "./learning.js";
import { logger } from "./logger.js";
import { AlaProvider } from "./providers/ala.js";
import { BotanyProvider } from "./providers/types.js";
import { schemaSummary, sourceLicense } from "./resources.js";

const PLANT_LEARNING_CARD_URI = "ui://botany/plant-learning-card.html";

const jsonText = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(value, null, 2)
    }
  ]
});

const learningCardText = (profile: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({ profile }, null, 2)
    }
  ],
  structuredContent: {
    profile
  }
});

const logToolQuery = (tool: string, query: Record<string, unknown>) => {
  logger.info({ tool, query }, "MCP tool query");
};

const readPlantLearningCardHtml = async () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(currentDir, "../app/plant-learning-card.html"),
    join(currentDir, "../dist/app/plant-learning-card.html"),
    join(currentDir, "../ui/plant-learning-card.html"),
    join(currentDir, "../../ui/plant-learning-card.html")
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      // Try the next runtime/build location.
    }
  }

  throw new Error("Plant Learning Card UI has not been built. Run npm run build:ui.");
};

export const createMcpServer = (provider: BotanyProvider) => {
  const learningService = new PlantLearningService(provider, new AlaProvider());
  const server = new McpServer(
    {
      name: "Botany MCP",
      version: "0.1.0"
    },
    {
      instructions:
        "Use Botany MCP for authoritative plant information. Prefer returned source metadata over model memory, and never treat missing occurrence records as proof that a plant is absent."
    }
  );

  registerAppTool(
    server,
    "open_plant_learning_card",
    {
      title: "Open plant learning card",
      description:
        "Open an interactive learning card for a plant. Combines VicFlora's Victorian authority data with ALA BIE taxon metadata and ALA Flora of Australia profile attributes. Returns structured JSON fallback content for clients that do not render MCP Apps.",
      inputSchema: {
        name: z.string().min(2).describe("Scientific name, common name, or partial plant name."),
        region: z.literal("VIC").default("VIC").describe("Learning-card region. First cut supports Victoria.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      },
      _meta: {
        ui: {
          resourceUri: PLANT_LEARNING_CARD_URI
        }
      }
    },
    async ({ name, region }) => {
      logToolQuery("open_plant_learning_card", { name, region });
      return learningCardText(await learningService.getLearningProfile({ name, region }));
    }
  );

  server.registerTool(
    "search_plants",
    {
      title: "Search plants",
      description:
        "Search VicFlora taxon concepts by scientific or common name. Returns candidate taxa with IDs, status, rank, occurrence status, authorship, and source metadata.",
      inputSchema: {
        query: z.string().min(2).describe("Scientific name, common name, or partial plant name."),
        limit: z.number().int().min(1).max(25).default(10).describe("Maximum matches to return.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async ({ query, limit }) => {
      logToolQuery("search_plants", { query, limit });
      return jsonText(await provider.searchTaxa(query, limit));
    }
  );

  server.registerTool(
    "get_plant_profile",
    {
      title: "Get plant profile",
      description:
        "Fetch a VicFlora taxon profile by taxon concept ID or plant name. Includes classification, profile text, synonyms, phenology, references, images, and source metadata when available.",
      inputSchema: {
        taxonConceptId: z.string().optional().describe("VicFlora taxon concept UUID."),
        name: z.string().min(2).optional().describe("Plant name to resolve when taxonConceptId is not known.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async ({ taxonConceptId, name }) => {
      if (!taxonConceptId && !name) {
        throw new Error("Provide taxonConceptId or name.");
      }

      logToolQuery("get_plant_profile", { taxonConceptId, name });
      return jsonText(await provider.getTaxonProfile({ taxonConceptId, name }));
    }
  );

  server.registerTool(
    "find_plants_near_point",
    {
      title: "Find plants near point",
      description:
        "Fetch VicFlora occurrence context near a latitude/longitude. With a taxon filter, returns specimen occurrence records. Without one, returns taxa associated with the point geometry.",
      inputSchema: {
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        distanceDegrees: z
          .number()
          .positive()
          .max(1)
          .default(0.02)
          .describe("VicFlora distance parameter in decimal degrees. Default is 0.02."),
        limit: z.number().int().min(1).max(100).default(25),
        taxonConceptId: z.string().optional().describe("Optional VicFlora taxon concept UUID."),
        taxonName: z.string().min(2).optional().describe("Optional plant name to resolve to a taxon concept.")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async ({ latitude, longitude, distanceDegrees, limit, taxonConceptId, taxonName }) => {
      logToolQuery("find_plants_near_point", {
        latitude,
        longitude,
        distanceDegrees,
        limit,
        taxonConceptId,
        taxonName
      });

      return jsonText(
        await provider.getOccurrences({
          latitude,
          longitude,
          distanceDegrees,
          limit,
          taxonConceptId,
          taxonName
        })
      );
    }
  );

  server.registerTool(
    "lookup_botanical_terms",
    {
      title: "Lookup botanical terms",
      description:
        "Look up VicFlora glossary terms by name, or scan a text snippet for glossary terms and definitions.",
      inputSchema: {
        query: z.string().min(2),
        mode: z.enum(["name", "text"]).default("name")
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true
      }
    },
    async ({ query, mode }) => {
      logToolQuery("lookup_botanical_terms", { query, mode });
      return jsonText(await provider.getGlossaryTerms({ query, mode }));
    }
  );

  server.registerResource(
    "vicflora_schema_summary",
    "vicflora://schema/summary",
    {
      title: "VicFlora schema summary",
      description: "Summary of the VicFlora capabilities exposed by Botany MCP.",
      mimeType: "application/json"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(schemaSummary, null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "vicflora_source_license",
    "vicflora://source/license",
    {
      title: "VicFlora source and license",
      description: "VicFlora API source, contact, and license details.",
      mimeType: "application/json"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(sourceLicense, null, 2)
        }
      ]
    })
  );

  registerAppResource(
    server,
    "Plant Learning Card",
    PLANT_LEARNING_CARD_URI,
    {
      title: "Plant Learning Card",
      description: "Interactive plant learning card for VicFlora and ALA profile data.",
      mimeType: RESOURCE_MIME_TYPE
    },
    async () => ({
      contents: [
        {
          uri: PLANT_LEARNING_CARD_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readPlantLearningCardHtml(),
          _meta: {
            ui: {
              csp: {
                resourceDomains: [config.publicBaseUrl],
                connectDomains: [config.publicBaseUrl]
              }
            }
          }
        }
      ]
    })
  );

  return server;
};
