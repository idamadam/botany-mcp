import { afterEach, describe, expect, it, vi } from "vitest";
import searchFixture from "./fixtures/search-eucalyptus-pauciflora.json" with { type: "json" };
import { VicFloraProvider } from "../src/providers/vicflora.js";

describe("VicFloraProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("normalizes taxon search results with source metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T00:00:00.000Z"));

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(searchFixture), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const provider = new VicFloraProvider();
    const result = await provider.searchTaxa("Eucalyptus pauciflora", 5);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      id: "f6c2d8e7-9d03-4677-b4c8-1caee39964c7",
      scientificName: "Eucalyptus pauciflora",
      scientificNameWithAuthorship: "Eucalyptus pauciflora Sieber ex Spreng.",
      rank: "SPECIES",
      taxonomicStatus: "ACCEPTED",
      occurrenceStatus: "PRESENT",
      preferredCommonName: "Snow gum"
    });
    expect(result.metadata).toMatchObject({
      provider: "VicFlora",
      operation: "taxonConceptAutocomplete",
      retrievedAt: "2026-06-14T00:00:00.000Z"
    });
  });

  it("falls back to common-name search and singularizes plural names", async () => {
    global.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body));

      if (body.operationName === "SearchTaxa") {
        return new Response(JSON.stringify({ data: { taxonConceptAutocomplete: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (body.variables.input.q === "golden wattles") {
        return new Response(JSON.stringify({ data: { search: { docs: [] } } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify({
          data: {
            search: {
              docs: [
                {
                  id: "20f70d14-0560-467d-a05e-e23eefc93ac6",
                  scientificName: "Acacia pycnantha",
                  scientificNameAuthorship: "Benth.",
                  taxonRank: "species",
                  taxonomicStatus: "accepted",
                  occurrenceStatus: "present",
                  establishmentMeans: "native",
                  degreeOfEstablishment: "native",
                  preferredVernacularName: "Golden Wattle",
                  vernacularName: ["Golden Wattle"]
                }
              ]
            }
          }
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    });

    const provider = new VicFloraProvider();
    const result = await provider.searchTaxa("golden wattles", 10);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      id: "20f70d14-0560-467d-a05e-e23eefc93ac6",
      scientificName: "Acacia pycnantha",
      scientificNameWithAuthorship: "Acacia pycnantha Benth.",
      rank: "SPECIES",
      taxonomicStatus: "ACCEPTED",
      occurrenceStatus: "PRESENT",
      preferredCommonName: "Golden Wattle",
      commonNames: ["Golden Wattle"]
    });
    expect(result.metadata.operation).toBe("taxonConceptAutocomplete + search");
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("surfaces GraphQL errors", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ errors: [{ message: "Field failed" }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const provider = new VicFloraProvider();
    await expect(provider.searchTaxa("bad query", 5)).rejects.toThrow("Field failed");
  });

  it("validates HTTP failures", async () => {
    global.fetch = vi.fn(async () => new Response("nope", { status: 503 }));

    const provider = new VicFloraProvider();
    await expect(provider.searchTaxa("Eucalyptus", 5)).rejects.toThrow("VicFlora returned HTTP 503");
  });
});
