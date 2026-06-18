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
  family: "Myrtaceae",
  groupLabel: "Eucalypt",
  spotIt: {
    oneLiner: "A smooth-barked tree of waterways, with long narrow leaves and small clustered white flowers.",
    fieldMarks: [
      "Smooth mottled bark",
      "Lance-shaped adult leaves",
      "Hemispherical fruit",
      "Cuboid-pyramidal seeds"
    ],
    heroImage: {
      url: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fhabit.jpg",
      displayLabel: "Whole plant",
      group: "habit",
      caption: "Mature tree beside a watercourse."
    }
  },
  inVictoria: {
    statusLabel: "Native to Victoria",
    where: "Widespread along rivers and floodplains in Victoria.",
    when: "Flowers summer."
  },
  detail: {
    fullDescription: "A large tree, commonly to 20 metres, with smooth white, grey, brown, or red bark.",
    nationalRange: "Occurs in every mainland state and territory.",
    nationalHabitat: "Along permanent and intermittent watercourses.",
    confusionNotes: "Only the type subspecies occurs naturally in Victoria; national treatments recognise several subspecies."
  },
  media: {
    gallery: [
      {
        url: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fhabit.jpg",
        displayLabel: "Whole plant",
        group: "habit",
        caption: "Mature tree beside a watercourse."
      }
    ],
    groups: {
      habit: [
        {
          url: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fhabit.jpg",
          displayLabel: "Whole plant",
          group: "habit"
        }
      ],
      flowers: [],
      fruit: [],
      details: []
    }
  },
  naming: {
    commonNames: ["River Red-gum", "Red Gum", "River Red Gum", "Murray Red Gum"],
    alsoKnownAs: ["Red Gum", "River Red Gum", "Murray Red Gum"]
  },
  references: [
    { label: "VicFlora", source: "Taxon profile", url: "https://vicflora.rbg.vic.gov.au/flora/taxon/b81ef7c6-89a0-45d7-9b2b-cebb16c7033a" },
    { label: "Flora of Australia", source: "Species profile", url: "https://profiles.ala.org.au/opus/foa/profile/Eucalyptus%20camaldulensis" }
  ],
  sources: [
    { source: "VicFlora", role: "Victorian authority", present: true, summary: "Local status, description, and references." },
    { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Accepted identity and common names." },
    { source: "ALA Flora of Australia", role: "National authored treatment", present: true, summary: "National diagnostic and habitat attributes." }
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
  family: "Fabaceae",
  groupLabel: "Wattle",
  spotIt: {
    oneLiner: "A shrub or small tree with curved phyllodes and masses of golden flower heads.",
    fieldMarks: [
      "Broad sickle-shaped phyllodes",
      "Globular bright-yellow flower heads",
      "Flattened pods"
    ]
  },
  inVictoria: {
    statusLabel: "Native to Victoria",
    where: "Widespread in central and western Victoria.",
    when: "Flowers mainly Aug–Oct."
  },
  detail: {
    fullDescription: "A spreading shrub or small tree with leathery green phyllodes and showy spring flowers.",
    nationalRange: "Native to south-eastern Australia.",
    nationalHabitat: "Dry sclerophyll forest and woodland.",
    confusionNotes: "Compare other wattles using phyllode shape, flower arrangement, and pod characters."
  },
  media: {
    gallery: [],
    groups: {
      habit: [],
      flowers: [],
      fruit: [],
      details: []
    }
  },
  naming: {
    commonNames: ["Golden Wattle"],
    alsoKnownAs: []
  },
  references: [{ label: "VicFlora", source: "VicFlora taxon profile" }],
  sources: [
    { source: "VicFlora", role: "Victorian authority", present: true, summary: "Local profile and status." },
    { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Accepted name and common names." },
    { source: "ALA Flora of Australia", role: "National authored treatment", present: false, summary: "No authored fixture treatment included." }
  ],
  rawSources: {},
  metadata,
  warnings: ["Harness fixture data: enable Live MCP to query the local server."]
};

const sweetBursaria: PlantLearningProfile = {
  query: { name: "Bursaria spinosa", region: "VIC" },
  displayName: "Sweet Bursaria",
  scientificName: "Bursaria spinosa",
  scientificNameWithAuthorship: "Bursaria spinosa (Cav.) F.Muell.",
  family: "Pittosporaceae",
  groupLabel: "Bursaria",
  spotIt: {
    oneLiner: "A spiny native shrub with clusters of fragrant white flowers and distinctive winged fruit.",
    fieldMarks: [
      "Stiff spines on older branches",
      "Opposite, oval, toothed leaves",
      "Terminal clusters of small white flowers",
      "Flat brown capsules with papery wings"
    ]
  },
  inVictoria: {
    statusLabel: "Native to Victoria",
    where: "Widespread in woodland, forest margins, and roadsides across much of Victoria.",
    when: "Flowers mainly Dec–Feb."
  },
  detail: {
    fullDescription: "An erect shrub or small tree, often 2–5 metres, with aromatic foliage and conspicuous winged seed capsules.",
    nationalRange: "Occurs in south-eastern mainland Australia and Tasmania.",
    nationalHabitat: "Dry and moist sclerophyll forest, woodland, and cleared land.",
    confusionNotes: "The spines, opposite leaves, and winged fruit distinguish it from most other white-flowered shrubs."
  },
  media: {
    gallery: [],
    groups: {
      habit: [],
      flowers: [],
      fruit: [],
      details: []
    }
  },
  naming: {
    commonNames: ["Sweet Bursaria", "Blackthorn", "Christmas Bush"],
    alsoKnownAs: ["Blackthorn", "Christmas Bush"]
  },
  references: [{ label: "VicFlora", source: "VicFlora taxon profile" }],
  sources: [
    { source: "VicFlora", role: "Victorian authority", present: true, summary: "Local profile and status." },
    { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Accepted name and common names." },
    { source: "ALA Flora of Australia", role: "National authored treatment", present: true, summary: "National diagnostic and habitat attributes." }
  ],
  rawSources: {},
  metadata,
  warnings: ["Harness fixture data: enable Live MCP to query the local server."]
};

const goldenSpray: PlantLearningProfile = {
  query: { name: "Viminaria juncea", region: "VIC" },
  displayName: "Golden Spray",
  scientificName: "Viminaria juncea",
  scientificNameWithAuthorship: "Viminaria juncea (Schrad. & J.C.Wendl.) Hoffmanns.",
  family: "Fabaceae",
  groupLabel: "Pea-flower",
  spotIt: {
    oneLiner: "A leafless shrub of wet forests with green whip-like stems and sprays of bright yellow pea flowers.",
    fieldMarks: [
      "Leafless green stems (cladodes)",
      "Loose terminal sprays of yellow flowers",
      "Small flattened pods",
      "Often beside streams and in damp gullies"
    ]
  },
  inVictoria: {
    statusLabel: "Native to Victoria",
    where: "Eastern Victoria in cool temperate and wet forest, often along watercourses.",
    when: "Flowers mainly Sep–Nov."
  },
  detail: {
    fullDescription: "An open shrub to about 3 metres with rush-like green stems and showy yellow flowers in spring.",
    nationalRange: "South-eastern mainland Australia from Victoria to south-eastern Queensland.",
    nationalHabitat: "Cool temperate rainforest, wet sclerophyll forest, and riparian scrub.",
    confusionNotes: "The leafless green stems and yellow pea flowers are distinctive; compare with other leafless wattles using flower and pod details."
  },
  media: {
    gallery: [],
    groups: {
      habit: [],
      flowers: [],
      fruit: [],
      details: []
    }
  },
  naming: {
    commonNames: ["Golden Spray", "Leafless Pore-flower"],
    alsoKnownAs: ["Leafless Pore-flower"]
  },
  references: [{ label: "VicFlora", source: "VicFlora taxon profile" }],
  sources: [
    { source: "VicFlora", role: "Victorian authority", present: true, summary: "Local profile and status." },
    { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Accepted name and common names." },
    { source: "ALA Flora of Australia", role: "National authored treatment", present: true, summary: "National diagnostic and habitat attributes." }
  ],
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
          spotIt: z.object({}).passthrough(),
          inVictoria: z.object({}).passthrough(),
          naming: z.object({
            commonNames: z.array(z.string())
          }).passthrough(),
          sources: z.array(z.object({}).passthrough()),
          references: z.array(z.object({}).passthrough()),
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
  },
  {
    id: "sweet-bursaria",
    label: "Show me Sweet Bursaria",
    userMessage: "Show me a learning card for Bursaria spinosa.",
    assistantBefore: "Here’s a field-oriented overview of Sweet Bursaria from Victorian and national sources.",
    assistantAfter: "Look for spines, opposite toothed leaves, and winged fruit capsules — especially when the white flower clusters are out in summer.",
    tool: {
      name: "open_plant_learning_card",
      arguments: { name: "Bursaria spinosa", region: "VIC" },
      resourceUri: APP_RESOURCE_URI,
      result: profileResult(sweetBursaria)
    }
  },
  {
    id: "golden-spray",
    label: "Teach me Golden Spray",
    userMessage: "Teach me about Viminaria juncea and how to recognise it.",
    assistantBefore: "Golden Spray is a distinctive leafless shrub — let’s line up the key field marks.",
    assistantAfter: "The green whip-like stems and loose yellow flower sprays are hard to miss in spring along damp gullies.",
    tool: {
      name: "open_plant_learning_card",
      arguments: { name: "Viminaria juncea", region: "VIC" },
      resourceUri: APP_RESOURCE_URI,
      result: profileResult(goldenSpray)
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
