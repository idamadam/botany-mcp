export const schemaSummary = {
  provider: "VicFlora",
  description:
    "Botany MCP currently exposes read-only VicFlora search, taxon profile, occurrence-context, and glossary lookups.",
  graphqlEndpoint: "https://vicflora.rbg.vic.gov.au/graphql",
  supportedTools: [
    "search_plants",
    "get_plant_profile",
    "find_plants_near_point",
    "lookup_botanical_terms"
  ],
  caution:
    "Occurrence records are evidence records. Sparse or empty results must not be interpreted as proof of absence."
};

export const sourceLicense = {
  provider: "VicFlora",
  apiDocs: "https://vicflora.rbg.vic.gov.au/api/",
  graphqlEndpoint: "https://vicflora.rbg.vic.gov.au/graphql",
  contact: "vicflora@rbg.vic.gov.au",
  license: "Apache 2.0",
  licenseUrl: "http://www.apache.org/licenses/LICENSE-2.0.html"
};
