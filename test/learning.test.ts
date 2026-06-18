import { describe, expect, it } from "vitest";
import { PlantLearningService } from "../src/learning.js";
import { AlaFloraProfileResult, AlaTaxonResult } from "../src/providers/ala.js";
import { BotanyProvider, PlantProfile } from "../src/providers/types.js";

const metadata = {
  provider: "Test",
  source: "Test",
  sourceUrl: "https://example.test",
  retrievedAt: "2026-06-14T00:00:00.000Z",
  operation: "test"
};

const vicfloraProfile: PlantProfile = {
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
  profileText:
    '<p class="description">Tree to 40 m tall; bark smooth and mottled.</p><p class="phenology">Flowers summer.</p><p class="habitat">Widespread along rivers in Victoria.</p><p class="note">Only the type subspecies occurs in Victoria.</p>',
  profileModified: "2018-08-28",
  classification: [],
  synonyms: [],
  phenology: [],
  images: [
    {
      id: "image-1",
      title: "Eucalyptus camaldulensis",
      previewUrl: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fvicflora-cdn.rbg.vic.gov.au%2Fimage.jpg",
      previewSourceUrl: "https://vicflora-cdn.rbg.vic.gov.au/image.jpg",
      caption: "<i>Eucalyptus camaldulensis</i>",
      creator: "VicFlora Photographer",
      license: "CC BY-NC-SA 4.0"
    }
  ],
  references: [
    {
      title: "~Eucalyptus~",
      referenceString: "Brooker & Slee (1996). Flora of Victoria Vol. 3."
    }
  ],
  metadata
};

const provider = (profile: PlantProfile): BotanyProvider => ({
  searchTaxa: async () => ({ query: "", matches: [], metadata }),
  getTaxonProfile: async () => profile,
  getOccurrences: async () => ({
    query: { latitude: 0, longitude: 0, distanceDegrees: 0.02, limit: 1 },
    note: "",
    occurrences: [],
    metadata
  }),
  getGlossaryTerms: async () => ({ query: "", mode: "name", matches: [], metadata })
});

const alaTaxonResult: AlaTaxonResult = {
  query: "Eucalyptus camaldulensis",
  taxon: {
    guid: "https://id.biodiversity.org.au/node/apni/2921040",
    scientificName: "Eucalyptus camaldulensis",
    scientificNameWithAuthorship: "Eucalyptus camaldulensis Dehnh.",
    commonNameSingle: "Red Gum",
    commonNames: ["Red Gum", "River Red Gum", "Murray Red Gum"],
    classification: [],
    sourceUrl: "https://bie.ala.org.au/species/https://id.biodiversity.org.au/node/apni/2921040"
  },
  metadata
};

const alaProfileResult: AlaFloraProfileResult = {
  query: "Eucalyptus camaldulensis",
  profile: {
    id: "profile-1",
    scientificName: "Eucalyptus camaldulensis",
    fullName: "Eucalyptus camaldulensis Dehnh.",
    opusName: "Flora of Australia",
    opusShortName: "foa",
    authorship: [{ category: "Author", text: "A.V. Slee" }],
    attributes: [],
    attributeMap: {
      "Common Name": "River Red Gum, River Gum",
      "Diagnostic Features": "A smooth-barked tree along streams with cuboid-pyramidal seeds.",
      Description: "Tree commonly to 20 m high, occasionally to 45 m.",
      Biostatus: "Native.",
      Distribution: "Occurs in every mainland State.",
      Habitat: "Grows along and near watercourses.",
      "Taxonomic Notes": "Seven subspecies have reasonably discrete geographic distributions.",
      Source: "Published 25 October 2025. Adapted from EUCLID."
    },
    sourceUrl: "https://profiles.ala.org.au/opus/foa/profile/Eucalyptus%20camaldulensis/json?fullClassification=true"
  },
  metadata
};

describe("PlantLearningService", () => {
  it("merges VicFlora authority data with ALA profile data", async () => {
    const service = new PlantLearningService(provider(vicfloraProfile), {
      resolveTaxon: async () => alaTaxonResult,
      getFloraProfile: async () => alaProfileResult
    });

    const result = await service.getLearningProfile({ name: "river red gum" });

    expect(result.displayName).toBe("River Red-gum");
    expect(result.scientificName).toBe("Eucalyptus camaldulensis");
    expect(result.commonNames).toContain("Murray Red Gum");
    expect(result.recognition.diagnosticFeatures).toContain("smooth-barked");
    expect(result.status).toMatchObject({
      victorian: "PRESENT",
      establishmentMeans: "NATIVE",
      nationalBiostatus: "Native."
    });
    expect(result.sourceComparison.map((source) => source.present)).toEqual([true, true, true]);
    expect(result.citations.map((citation) => citation.label)).toContain("Flora of Australia");
  });

  it("returns a VicFlora-only profile when ALA sources are unavailable", async () => {
    const service = new PlantLearningService(provider(vicfloraProfile), {
      resolveTaxon: async () => ({ query: "Eucalyptus camaldulensis", metadata }),
      getFloraProfile: async () => ({ query: "Eucalyptus camaldulensis", metadata })
    });

    const result = await service.getLearningProfile({ name: "Eucalyptus camaldulensis" });

    expect(result.displayName).toBe("River Red-gum");
    expect(result.recognition.description).toContain("Tree to 40 m tall");
    expect(result.sourceComparison.map((source) => source.present)).toEqual([true, false, false]);
    expect(result.citations[0].source).toContain("Flora of Victoria");
  });
});
