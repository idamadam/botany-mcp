import { afterEach, describe, expect, it, vi } from "vitest";
import { AlaProvider } from "../src/providers/ala.js";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });

describe("AlaProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("normalizes BIE taxon search results", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T00:00:00.000Z"));

    global.fetch = vi.fn(async () =>
      jsonResponse({
        searchResults: {
          results: [
            {
              idxtype: "TAXON",
              guid: "https://id.biodiversity.org.au/node/apni/2921040",
              scientificName: "Eucalyptus camaldulensis",
              nameComplete: "Eucalyptus camaldulensis Dehnh.",
              scientificNameAuthorship: "Dehnh.",
              taxonomicStatus: "accepted",
              rank: "species",
              commonNameSingle: "Red Gum",
              commonName: "Red Gum, River Red Gum, Murray Red Gum",
              occurrenceCount: 62816,
              infoSourceName: "APC",
              imageUrl: "https://images.ala.org.au/image/example/original",
              thumbnailUrl: "https://images.ala.org.au/image/example/thumbnail",
              kingdom: "Plantae",
              family: "Myrtaceae",
              genus: "Eucalyptus"
            }
          ]
        }
      })
    );

    const result = await new AlaProvider().resolveTaxon("Eucalyptus camaldulensis");

    expect(result.taxon).toMatchObject({
      guid: "https://id.biodiversity.org.au/node/apni/2921040",
      scientificName: "Eucalyptus camaldulensis",
      scientificNameWithAuthorship: "Eucalyptus camaldulensis Dehnh.",
      commonNameSingle: "Red Gum",
      commonNames: ["Red Gum", "River Red Gum", "Murray Red Gum"],
      occurrenceCount: 62816
    });
    expect(result.taxon?.imageUrl).toContain("http://localhost:3000/images/vicflora?url=");
    expect(result.metadata).toMatchObject({
      provider: "ALA",
      operation: "bie search",
      retrievedAt: "2026-06-14T00:00:00.000Z"
    });
  });

  it("normalizes Flora of Australia profile attributes", async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        profile: {
          uuid: "profile-1",
          scientificName: "Eucalyptus camaldulensis",
          fullName: "Eucalyptus camaldulensis Dehnh.",
          guid: "https://id.biodiversity.org.au/node/apni/2921040",
          rank: "species",
          profileStatus: "Legacy",
          lastPublished: "2025-12-08T01:00:00Z",
          opusName: "Flora of Australia",
          opusShortName: "foa",
          authorship: [{ category: "Author", text: "A.V. Slee" }],
          attributes: [
            { title: "Description", plainText: "Tree commonly to 20 m high." },
            { title: "Habitat", text: "<p>Grows along watercourses.</p>" },
            { title: "Notes", plainText: "" }
          ]
        }
      })
    );

    const result = await new AlaProvider().getFloraProfile("Eucalyptus camaldulensis");

    expect(result.profile).toMatchObject({
      id: "profile-1",
      opusName: "Flora of Australia",
      attributeMap: {
        Description: "Tree commonly to 20 m high.",
        Habitat: "Grows along watercourses.",
        Notes: ""
      }
    });
  });

  it("treats missing Flora of Australia profiles as absent", async () => {
    global.fetch = vi.fn(async () =>
      new Response("<html>Not Found</html>", {
        status: 404,
        headers: { "content-type": "text/html" }
      })
    );

    const result = await new AlaProvider().getFloraProfile("No such plant");

    expect(result.profile).toBeUndefined();
    expect(result.metadata.operation).toBe("foa profile");
  });
});
