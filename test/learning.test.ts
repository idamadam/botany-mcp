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
    '<p class="description">Tree to 40 m tall; bark smooth and mottled.</p><p class="phenology">Flowers summer.</p><p class="habitat">Widespread along rivers in Victoria.</p><p class="distribution_australia">Occurs in every mainland State.</p><p class="note">Only the type subspecies occurs in Victoria.</p>',
  profileModified: "2018-08-28",
  classification: [
    {
      id: "family-1",
      scientificName: "Myrtaceae",
      rank: "FAMILY",
      commonNames: [],
      sourceUrl: "https://example.test/family"
    },
    {
      id: "genus-1",
      scientificName: "Eucalyptus",
      rank: "GENUS",
      commonNames: [],
      sourceUrl: "https://example.test/genus"
    }
  ],
  synonyms: [],
  phenology: [
    { month: "Dec", total: 4, buds: 1, flowers: 3, fruit: 0 },
    { month: "Jan", total: 6, buds: 0, flowers: 6, fruit: 0 }
  ],
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
    expect(result.naming.commonNames).toContain("Murray Red Gum");
    expect(result.naming.alsoKnownAs).toContain("Murray Red Gum");
    expect(result.naming.alsoKnownAs).not.toContain("River Red-gum");
    expect(result.spotIt.oneLiner).toContain("smooth-barked");
    expect(result.inVictoria.statusLabel).toBe("Native to Victoria");
    expect(result.inVictoria.where).toContain("rivers");
    expect(result.inVictoria.when).toBe("Flowers summer.");
    expect(result.family).toBe("Myrtaceae");
    expect(result.groupLabel).toBe("Eucalypt");
    expect(result.detail.nationalRange).toContain("mainland State");
    expect(result.sources.map((source) => source.present)).toEqual([true, true, true]);
    expect(result.references.map((reference) => reference.label)).toContain("Flora of Australia");
  });

  it("prefers VicFlora heroImage over detail shots earlier in the list", async () => {
    const profileWithMixedImages: PlantProfile = {
      ...vicfloraProfile,
      images: [
        {
          id: "detail",
          title: "Longitudinal section through capsule",
          previewUrl: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fdetail.jpg",
          previewSourceUrl: "https://example.test/detail.jpg",
          heroImage: false,
          rating: 5,
          pixelXDimension: 1200,
          pixelYDimension: 900
        },
        {
          id: "habit",
          title: "Big old river red gum beside the Murray River",
          previewUrl: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fhabit.jpg",
          previewSourceUrl: "https://example.test/habit.jpg",
          heroImage: false,
          rating: 4,
          pixelXDimension: 3872,
          pixelYDimension: 2592
        }
      ]
    };

    const service = new PlantLearningService(provider(profileWithMixedImages), {
      resolveTaxon: async () => ({ query: "Eucalyptus camaldulensis", metadata }),
      getFloraProfile: async () => ({ query: "Eucalyptus camaldulensis", metadata })
    });

    const result = await service.getLearningProfile({ name: "Eucalyptus camaldulensis" });

    expect(result.spotIt.heroImage?.url).toContain("habit.jpg");
    expect(result.media.gallery).toHaveLength(2);
    expect(result.media.gallery[0].url).toContain("habit.jpg");
    expect(result.media.gallery[1].group).toBe("details");
    expect(result.media.groups?.details).toHaveLength(1);
    expect(result.media.groups?.habit).toHaveLength(1);
  });

  it("places hero image at gallery index 0 when present in VicFlora images", async () => {
    const profileWithMixedImages: PlantProfile = {
      ...vicfloraProfile,
      images: [
        {
          id: "detail",
          title: "Longitudinal section through capsule",
          previewUrl: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fdetail.jpg",
          previewSourceUrl: "https://example.test/detail.jpg",
          heroImage: false,
          rating: 5,
          pixelXDimension: 1200,
          pixelYDimension: 900
        },
        {
          id: "habit",
          title: "Big old river red gum beside the Murray River",
          previewUrl: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fhabit.jpg",
          previewSourceUrl: "https://example.test/habit.jpg",
          heroImage: false,
          rating: 4,
          pixelXDimension: 3872,
          pixelYDimension: 2592
        }
      ]
    };

    const service = new PlantLearningService(provider(profileWithMixedImages), {
      resolveTaxon: async () => ({ query: "Eucalyptus camaldulensis", metadata }),
      getFloraProfile: async () => ({ query: "Eucalyptus camaldulensis", metadata })
    });

    const result = await service.getLearningProfile({ name: "Eucalyptus camaldulensis" });

    expect(result.spotIt.heroImage?.url).toBe(result.media.gallery[0].url);
  });

  it("skips VicFlora flowering-branch hero flags for habit overview shots", async () => {
    const profileWithMixedImages: PlantProfile = {
      ...vicfloraProfile,
      images: [
        {
          id: "flower-branch",
          title: "Acacia pycnantha flg brnch near Cave of Ghosts",
          previewUrl: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Fflower.jpg",
          previewSourceUrl: "https://example.test/flower.jpg",
          heroImage: true,
          rating: 5,
          pixelXDimension: 3000,
          pixelYDimension: 2000
        },
        {
          id: "habit",
          title: "Mature golden wattle tree in woodland",
          previewUrl: "http://localhost:3000/images/vicflora?url=https%3A%2F%2Fexample.test%2Ftree.jpg",
          previewSourceUrl: "https://example.test/tree.jpg",
          heroImage: false,
          rating: 4,
          pixelXDimension: 4000,
          pixelYDimension: 3000
        }
      ]
    };

    const service = new PlantLearningService(provider(profileWithMixedImages), {
      resolveTaxon: async () => ({ query: "Acacia pycnantha", metadata }),
      getFloraProfile: async () => ({ query: "Acacia pycnantha", metadata })
    });

    const result = await service.getLearningProfile({ name: "Acacia pycnantha" });

    expect(result.spotIt.heroImage?.url).toContain("tree.jpg");
  });

  it("formats phenology from monthly records when HTML text is absent", async () => {
    const profileWithMonthlyPhenology: PlantProfile = {
      ...vicfloraProfile,
      profileText: '<p class="description">Tree to 40 m tall.</p><p class="habitat">Along rivers.</p>',
      phenology: [
        { month: "Nov", total: 2, buds: 0, flowers: 2, fruit: 0 },
        { month: "Dec", total: 5, buds: 0, flowers: 5, fruit: 0 },
        { month: "Jan", total: 3, buds: 0, flowers: 1, fruit: 2, }
      ]
    };

    const service = new PlantLearningService(provider(profileWithMonthlyPhenology), {
      resolveTaxon: async () => ({ query: "Eucalyptus camaldulensis", metadata }),
      getFloraProfile: async () => ({ query: "Eucalyptus camaldulensis", metadata })
    });

    const result = await service.getLearningProfile({ name: "Eucalyptus camaldulensis" });

    expect(result.inVictoria.when).toBe("Flowers mainly Nov–Jan. Fruit mainly Jan");
  });

  it("does not repeat the one-liner in field marks", async () => {
    const profileWithLongDiagnostic: AlaFloraProfileResult = {
      ...alaProfileResult,
      profile: {
        ...alaProfileResult.profile!,
        attributeMap: {
          ...alaProfileResult.profile!.attributeMap,
          "Diagnostic Features":
            "Eucalyptus camaldulensis is notably a smooth-barked tree along streams. The species over its whole distribution is distinguished by the seeds, which are cuboid-pyramidal."
        }
      }
    };

    const service = new PlantLearningService(provider(vicfloraProfile), {
      resolveTaxon: async () => alaTaxonResult,
      getFloraProfile: async () => profileWithLongDiagnostic
    });

    const result = await service.getLearningProfile({ name: "Eucalyptus camaldulensis" });

    expect(result.spotIt.oneLiner).toContain("smooth-barked tree along streams");
    expect(result.spotIt.fieldMarks[0]).toContain("seeds");
    expect(result.spotIt.fieldMarks.some((mark) => mark.includes("smooth-barked tree along streams"))).toBe(false);
  });

  it("curates noisy common names for the hero aliases line", async () => {
    const service = new PlantLearningService(provider(vicfloraProfile), {
      resolveTaxon: async () => ({
        ...alaTaxonResult,
        taxon: {
          ...alaTaxonResult.taxon!,
          commonNames: [
            "Golden Wattle",
            "Australian Golden Wattle",
            "Australian Golden Wattle.",
            "Witch",
            "Black Wattle"
          ]
        }
      }),
      getFloraProfile: async () => alaProfileResult
    });

    const result = await service.getLearningProfile({ name: "Acacia pycnantha" });

    expect(result.naming.alsoKnownAs).toContain("Black Wattle");
    expect(result.naming.alsoKnownAs).not.toContain("Witch");
    expect(result.naming.alsoKnownAs.filter((name) => name.startsWith("Australian Golden Wattle"))).toHaveLength(1);
    expect(result.naming.alsoKnownAs.length).toBeLessThanOrEqual(5);
  });

  it("returns a VicFlora-only profile when ALA sources are unavailable", async () => {
    const service = new PlantLearningService(provider(vicfloraProfile), {
      resolveTaxon: async () => ({ query: "Eucalyptus camaldulensis", metadata }),
      getFloraProfile: async () => ({ query: "Eucalyptus camaldulensis", metadata })
    });

    const result = await service.getLearningProfile({ name: "Eucalyptus camaldulensis" });

    expect(result.displayName).toBe("River Red-gum");
    expect(result.detail.fullDescription).toContain("Tree to 40 m tall");
    expect(result.sources.map((source) => source.present)).toEqual([true, false, false]);
    expect(result.references[0].source).toContain("Flora of Victoria");
  });
});
