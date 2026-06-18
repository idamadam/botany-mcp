import { TtlCache } from "../cache.js";
import { config } from "../config.js";
import { SourceMetadata } from "./types.js";

type AlaSearchResponse = {
  searchResults?: {
    results?: AlaSearchTaxon[];
  };
};

type AlaSearchTaxon = {
  idxtype?: string;
  guid?: string;
  linkIdentifier?: string;
  name?: string;
  scientificName?: string;
  scientificNameAuthorship?: string | null;
  nameComplete?: string;
  taxonomicStatus?: string;
  rank?: string;
  commonName?: string;
  commonNameSingle?: string;
  occurrenceCount?: number;
  conservationStatus?: string | null;
  infoSourceName?: string;
  infoSourceURL?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  largeImageUrl?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
};

type AlaProfileResponse = {
  profile?: {
    uuid?: string;
    scientificName?: string;
    fullName?: string;
    guid?: string;
    rank?: string;
    nameAuthor?: string;
    profileStatus?: string;
    lastPublished?: string;
    opusName?: string;
    opusShortName?: string;
    authorship?: Array<{ category?: string; text?: string }>;
    attributes?: AlaProfileAttribute[];
  };
};

export type AlaProfileAttribute = {
  title: string;
  plainText?: string;
  text?: string;
};

export type AlaTaxon = {
  guid: string;
  scientificName: string;
  scientificNameWithAuthorship?: string;
  authorship?: string;
  taxonomicStatus?: string;
  rank?: string;
  commonNameSingle?: string;
  commonNames: string[];
  occurrenceCount?: number;
  conservationStatus?: string | null;
  imageUrl?: string;
  imageSourceUrl?: string;
  thumbnailUrl?: string;
  thumbnailSourceUrl?: string;
  infoSourceName?: string;
  infoSourceURL?: string;
  classification: Array<{ rank: string; name: string }>;
  sourceUrl: string;
};

export type AlaFloraProfile = {
  id?: string;
  scientificName?: string;
  fullName?: string;
  guid?: string;
  rank?: string;
  status?: string;
  lastPublished?: string;
  opusName?: string;
  opusShortName?: string;
  authorship: Array<{ category?: string; text: string }>;
  attributes: AlaProfileAttribute[];
  attributeMap: Record<string, string>;
  sourceUrl: string;
};

export type AlaTaxonResult = {
  query: string;
  taxon?: AlaTaxon;
  metadata: SourceMetadata;
};

export type AlaFloraProfileResult = {
  query: string;
  profile?: AlaFloraProfile;
  metadata: SourceMetadata;
};

const htmlToText = (value: string | undefined) =>
  (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&times;/g, "x")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const unique = (values: Array<string | undefined | null>) => {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const proxyImage = (url: string | undefined) => {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (!config.imageProxyAllowedHosts.includes(parsed.hostname.toLowerCase())) {
      return url;
    }
  } catch {
    return url;
  }

  const proxyUrl = new URL(config.imageProxyPath, config.publicBaseUrl);
  proxyUrl.searchParams.set("url", url);
  return proxyUrl.toString();
};

export class AlaProvider {
  private readonly cache = new TtlCache<unknown>(config.alaCacheTtlMs);

  async resolveTaxon(query: string): Promise<AlaTaxonResult> {
    const url = new URL(config.alaBieSearchEndpoint);
    url.searchParams.set("q", query);

    const response = await this.fetchJson<AlaSearchResponse>(url.toString(), "ALA BIE search");
    const taxon =
      response.searchResults?.results?.find((result) =>
        result.idxtype === "TAXON" &&
        result.taxonomicStatus?.toLowerCase() === "accepted"
      ) ?? response.searchResults?.results?.[0];

    return {
      query,
      taxon: taxon ? this.toTaxon(taxon) : undefined,
      metadata: this.metadata("bie search")
    };
  }

  async getFloraProfile(name: string): Promise<AlaFloraProfileResult> {
    const encodedName = encodeURIComponent(name);
    const url = `${config.alaProfilesBaseUrl}/opus/foa/profile/${encodedName}/json?fullClassification=true`;

    try {
      const response = await this.fetchJson<AlaProfileResponse>(url, "ALA Flora of Australia profile");
      return {
        query: name,
        profile: response.profile ? this.toFloraProfile(response.profile, url) : undefined,
        metadata: this.metadata("foa profile")
      };
    } catch (error) {
      if (error instanceof AlaNotFoundError) {
        return {
          query: name,
          metadata: this.metadata("foa profile")
        };
      }

      throw error;
    }
  }

  private toTaxon(taxon: AlaSearchTaxon): AlaTaxon {
    const imageSourceUrl = taxon.imageUrl ?? taxon.largeImageUrl;
    const thumbnailSourceUrl = taxon.thumbnailUrl;
    return {
      guid: taxon.guid ?? taxon.linkIdentifier ?? taxon.scientificName ?? taxon.name ?? "",
      scientificName: taxon.scientificName ?? taxon.name ?? "",
      scientificNameWithAuthorship: taxon.nameComplete,
      authorship: taxon.scientificNameAuthorship ?? undefined,
      taxonomicStatus: taxon.taxonomicStatus,
      rank: taxon.rank,
      commonNameSingle: taxon.commonNameSingle,
      commonNames: unique([
        taxon.commonNameSingle,
        ...(taxon.commonName?.split(",") ?? [])
      ]),
      occurrenceCount: taxon.occurrenceCount,
      conservationStatus: taxon.conservationStatus,
      imageSourceUrl,
      imageUrl: proxyImage(imageSourceUrl),
      thumbnailSourceUrl,
      thumbnailUrl: proxyImage(thumbnailSourceUrl),
      infoSourceName: taxon.infoSourceName,
      infoSourceURL: taxon.infoSourceURL,
      classification: [
        ["kingdom", taxon.kingdom],
        ["phylum", taxon.phylum],
        ["class", taxon.class],
        ["order", taxon.order],
        ["family", taxon.family],
        ["genus", taxon.genus]
      ]
        .filter((item): item is [string, string] => Boolean(item[1]))
        .map(([rank, name]) => ({ rank, name })),
      sourceUrl: taxon.guid ? `https://bie.ala.org.au/species/${taxon.guid}` : "https://bie.ala.org.au/"
    };
  }

  private toFloraProfile(profile: NonNullable<AlaProfileResponse["profile"]>, sourceUrl: string): AlaFloraProfile {
    const attributes = (profile.attributes ?? []).map((attribute) => ({
      title: attribute.title,
      plainText: attribute.plainText?.trim() || htmlToText(attribute.text),
      text: attribute.text
    }));

    return {
      id: profile.uuid,
      scientificName: profile.scientificName,
      fullName: profile.fullName,
      guid: profile.guid,
      rank: profile.rank,
      status: profile.profileStatus,
      lastPublished: profile.lastPublished,
      opusName: profile.opusName,
      opusShortName: profile.opusShortName,
      authorship: (profile.authorship ?? [])
        .map((author) => ({ category: author.category, text: author.text?.trim() ?? "" }))
        .filter((author) => Boolean(author.text)),
      attributes,
      attributeMap: Object.fromEntries(
        attributes.map((attribute) => [attribute.title, attribute.plainText ?? ""])
      ),
      sourceUrl
    };
  }

  private async fetchJson<T>(url: string, label: string): Promise<T> {
    const cached = this.cache.get(url);
    if (cached) {
      return cached as T;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.alaTimeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "botany-mcp/0.1"
        },
        signal: controller.signal
      });

      if (response.status === 404) {
        throw new AlaNotFoundError(`${label} returned HTTP 404`);
      }

      if (!response.ok) {
        throw new Error(`${label} returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("json")) {
        throw new AlaNotFoundError(`${label} returned non-JSON content`);
      }

      const json = await response.json() as T;
      this.cache.set(url, json);
      return json;
    } catch (error) {
      if (error instanceof AlaNotFoundError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`${label} timed out after ${config.alaTimeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private metadata(operation: string): SourceMetadata {
    return {
      provider: "ALA",
      source: "Atlas of Living Australia",
      sourceUrl: "https://www.ala.org.au/",
      retrievedAt: new Date().toISOString(),
      operation
    };
  }
}

class AlaNotFoundError extends Error {}
