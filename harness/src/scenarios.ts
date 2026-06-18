import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PlantLearningProfile } from "../../src/providers/types.js";

export const APP_RESOURCE_URI = "ui://botany/plant-learning-card.html";

export type HarnessScenario = {
  id: string;
  label: string;
  userMessage: string;
  assistantBefore?: string;
  assistantAfter?: string;
  tool: {
    name: string;
    arguments: Record<string, unknown>;
    resourceUri: string;
    result: CallToolResult;
  };
};

const metadata = {
  provider: "Botany MCP fixture",
  source: "Harness scenario",
  sourceUrl: "botany://harness",
  retrievedAt: "2026-06-18T00:00:00.000Z",
  operation: "fixture"
};

const profileResult = (profile: PlantLearningProfile): CallToolResult => ({
  structuredContent: { profile },
  content: [{ type: "text", text: JSON.stringify({ profile }, null, 2) }]
});

const riverRedGum: PlantLearningProfile = {
  query: { name: "Eucalyptus camaldulensis", region: "VIC" },
  displayName: "River Red-gum",
  scientificName: "Eucalyptus camaldulensis",
  scientificNameWithAuthorship: "Eucalyptus camaldulensis Dehnh.",
  commonNames: ["River Red-gum", "Red Gum", "River Red Gum", "Murray Red Gum"],
  recognition: {
    summary: "A smooth-barked tree of waterways, with long narrow leaves and small clustered white flowers.",
    diagnosticFeatures: "Smooth mottled bark, lance-shaped adult leaves, hemispherical fruit, and cuboid-pyramidal seeds.",
    description: "A large tree, commonly to 20 metres, with smooth white, grey, brown, or red bark."
  },
  status: {
    victorian: "PRESENT",
    establishmentMeans: "NATIVE",
    degreeOfEstablishment: "NATIVE",
    nationalBiostatus: "Native."
  },
  distribution: {
    victoria: "Widespread along rivers and floodplains in Victoria.",
    national: "Occurs in every mainland state and territory."
  },
  habitat: {
    victoria: "Watercourses, floodplains, and seasonally inundated country.",
    national: "Along permanent and intermittent watercourses."
  },
  similarityNotes: "Only the type subspecies occurs naturally in Victoria; national treatments recognise several subspecies.",
  sourceComparison: [
    { source: "VicFlora", role: "Victorian authority", present: true, summary: "Local status, description, and references." },
    { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Accepted identity and common names." },
    { source: "ALA Flora of Australia", role: "National authored treatment", present: true, summary: "National diagnostic and habitat attributes." }
  ],
  citations: [
    { label: "VicFlora", source: "Taxon profile", url: "https://vicflora.rbg.vic.gov.au/flora/taxon/b81ef7c6-89a0-45d7-9b2b-cebb16c7033a" },
    { label: "Flora of Australia", source: "Species profile", url: "https://profiles.ala.org.au/opus/foa/profile/Eucalyptus%20camaldulensis" }
  ],
  rawSources: {},
  metadata,
  warnings: ["Harness fixture data: enable Live MCP to query the local server."]
};

const goldenWattle: PlantLearningProfile = {
  query: { name: "Acacia pycnantha", region: "VIC" },
  displayName: "Golden Wattle",
  scientificName: "Acacia pycnantha",
  scientificNameWithAuthorship: "Acacia pycnantha Benth.",
  commonNames: ["Golden Wattle"],
  recognition: {
    summary: "A shrub or small tree with curved phyllodes and masses of golden flower heads.",
    diagnosticFeatures: "Broad sickle-shaped phyllodes, globular bright-yellow flower heads, and flattened pods.",
    description: "A spreading shrub or small tree with leathery green phyllodes and showy spring flowers."
  },
  status: {
    victorian: "PRESENT",
    establishmentMeans: "NATIVE",
    degreeOfEstablishment: "NATIVE",
    nationalBiostatus: "Native."
  },
  distribution: {
    victoria: "Widespread in central and western Victoria.",
    national: "Native to south-eastern Australia."
  },
  habitat: {
    victoria: "Open forest, woodland, and disturbed sunny sites.",
    national: "Dry sclerophyll forest and woodland."
  },
  similarityNotes: "Compare other wattles using phyllode shape, flower arrangement, and pod characters.",
  sourceComparison: [
    { source: "VicFlora", role: "Victorian authority", present: true, summary: "Local profile and status." },
    { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Accepted name and common names." },
    { source: "ALA Flora of Australia", role: "National authored treatment", present: false, summary: "No authored fixture treatment included." }
  ],
  citations: [{ label: "VicFlora", source: "VicFlora taxon profile" }],
  rawSources: {},
  metadata,
  warnings: ["Harness fixture data: enable Live MCP to query the local server."]
};

const scenarioSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  userMessage: z.string().min(1),
  assistantBefore: z.string().optional(),
  assistantAfter: z.string().optional(),
  tool: z.object({
    name: z.string().min(1),
    arguments: z.record(z.unknown()),
    resourceUri: z.string().startsWith("ui://"),
    result: z.object({
      content: z.array(z.object({ type: z.string() }).passthrough()),
      structuredContent: z.object({
        profile: z.object({
          displayName: z.string().min(1),
          scientificName: z.string().min(1),
          commonNames: z.array(z.string()),
          recognition: z.object({}).passthrough(),
          status: z.object({}).passthrough(),
          sourceComparison: z.array(z.object({}).passthrough()),
          citations: z.array(z.object({}).passthrough()),
          warnings: z.array(z.string())
        }).passthrough()
      }).passthrough()
    }).passthrough()
  })
});

const authoredScenarios: HarnessScenario[] = [
  {
    id: "river-red-gum",
    label: "Show me River Red-gum",
    userMessage: "Show me a learning card for River Red-gum.",
    assistantBefore: "Here’s a field-oriented overview using Victorian and national botanical sources.",
    assistantAfter: "The smooth bark and waterway habitat are useful first clues, but use the diagnostic details when comparing similar eucalypts.",
    tool: {
      name: "open_plant_learning_card",
      arguments: { name: "Eucalyptus camaldulensis", region: "VIC" },
      resourceUri: APP_RESOURCE_URI,
      result: profileResult(riverRedGum)
    }
  },
  {
    id: "golden-wattle",
    label: "Teach me about Golden Wattle",
    userMessage: "Teach me about Golden Wattle and how to recognise it.",
    assistantBefore: "Let’s put the key recognition features and source coverage together.",
    assistantAfter: "Its curved phyllodes and dense golden flower heads are the quickest visual cues in season.",
    tool: {
      name: "open_plant_learning_card",
      arguments: { name: "Acacia pycnantha", region: "VIC" },
      resourceUri: APP_RESOURCE_URI,
      result: profileResult(goldenWattle)
    }
  }
];

export const parseScenarios = (value: unknown): HarnessScenario[] =>
  z.array(scenarioSchema).parse(value) as unknown as HarnessScenario[];

export const scenarios = parseScenarios(authoredScenarios);

export const fixtureResultForTool = (
  current: HarnessScenario,
  name: string,
  args: Record<string, unknown>
): CallToolResult => {
  if (name !== current.tool.name) {
    throw new Error(`Fixture mode has no result for tool "${name}".`);
  }
  const requestedName = String(args.name ?? "").toLowerCase();
  return scenarios.find((scenario) =>
    String(scenario.tool.arguments.name).toLowerCase() === requestedName
  )?.tool.result ?? current.tool.result;
};
