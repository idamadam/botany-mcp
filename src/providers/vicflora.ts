import { TtlCache } from "../cache.js";
import { config } from "../config.js";
import {
  BotanyProvider,
  GlossaryResult,
  OccurrenceResult,
  PlantProfile,
  PlantSearchResult,
  ProfileReference,
  SourceMetadata,
  TaxonSummary
} from "./types.js";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type VicFloraTaxonName = {
  id?: string;
  fullName?: string;
  authorship?: string;
  fullNameWithAuthorship?: string;
};

type VicFloraVernacularName = {
  id?: string;
  name?: string;
};

type VicFloraTaxonConcept = {
  id: string;
  taxonName?: VicFloraTaxonName;
  taxonRank?: string;
  taxonomicStatus?: string;
  occurrenceStatus?: string;
  establishmentMeans?: string;
  degreeOfEstablishment?: string;
  endemic?: boolean;
  preferredVernacularName?: VicFloraVernacularName | null;
  vernacularNames?: VicFloraVernacularName[];
  acceptedConcept?: VicFloraTaxonConcept | null;
  higherClassification?: VicFloraTaxonConcept[];
  synonyms?: VicFloraTaxonName[];
};

type VicFloraSearchDocument = {
  id: string;
  scientificName?: string | null;
  scientificNameAuthorship?: string | null;
  taxonRank?: string | null;
  taxonomicStatus?: string | null;
  occurrenceStatus?: string | null;
  establishmentMeans?: string | null;
  degreeOfEstablishment?: string | null;
  endemic?: boolean | null;
  preferredVernacularName?: string | null;
  vernacularName?: string[] | null;
};

const TAXON_FIELDS = `
  id
  taxonRank
  taxonomicStatus
  occurrenceStatus
  establishmentMeans
  degreeOfEstablishment
  endemic
  taxonName {
    id
    fullName
    authorship
    fullNameWithAuthorship
  }
  preferredVernacularName {
    id
    name
  }
  vernacularNames {
    id
    name
  }
`;

const SHALLOW_TAXON_FIELDS = `
  id
  taxonRank
  taxonomicStatus
  occurrenceStatus
  establishmentMeans
  degreeOfEstablishment
  endemic
  taxonName {
    id
    fullName
    authorship
    fullNameWithAuthorship
  }
  preferredVernacularName {
    id
    name
  }
  vernacularNames {
    id
    name
  }
`;

const SEARCH_TAXA_QUERY = `
  query SearchTaxa($q: String!) {
    taxonConceptAutocomplete(q: $q) {
      ${TAXON_FIELDS}
    }
  }
`;

const SEARCH_TAXA_FULLTEXT_QUERY = `
  query SearchTaxaFullText($input: SearchInput) {
    search(input: $input) {
      docs {
        id
        scientificName
        scientificNameAuthorship
        taxonRank
        taxonomicStatus
        occurrenceStatus
        establishmentMeans
        degreeOfEstablishment
        endemic
        preferredVernacularName
        vernacularName
      }
    }
  }
`;

const TAXON_PROFILE_QUERY = `
  query TaxonProfile($id: ID!) {
    taxonConcept(id: $id) {
      ${TAXON_FIELDS}
      acceptedConcept {
        ${SHALLOW_TAXON_FIELDS}
      }
      higherClassification {
        ${SHALLOW_TAXON_FIELDS}
      }
      synonyms {
        id
        fullName
        authorship
        fullNameWithAuthorship
      }
    }
    taxonConceptProfiles(taxonConceptId: $id) {
      id
      profile
      modified
      updatedAt
      source {
        id
        title
        referenceString
        referenceStringMarkdown
        doi
      }
    }
    taxonConceptPhenology(taxonConceptId: $id) {
      month
      total
      buds
      flowers
      fruit
    }
    taxonConceptImages(taxonConceptId: $id, first: 5, page: 1) {
      data {
        id
        title
        caption
        creator
        license
        thumbnailUrl
        previewUrl
      }
    }
  }
`;

const OCCURRENCES_AT_POINT_QUERY = `
  query OccurrencesAtPoint(
    $taxonConceptId: ID!,
    $latitude: Float!,
    $longitude: Float!,
    $distance: Float,
    $first: Int,
    $page: Int
  ) {
    taxonOccurrencesAtPoint(
      taxonConceptId: $taxonConceptId,
      latitude: $latitude,
      longitude: $longitude,
      distance: $distance,
      first: $first,
      page: $page
    ) {
      paginatorInfo {
        count
        currentPage
        hasMorePages
        total
      }
      data {
        properties {
          uuid
          dataSource
          collection
          catalogNumber
          recordedBy
          recordNumber
          eventDate
          scientificName
          speciesName
          decimalLatitude
          decimalLongitude
          occurrenceStatus
          establishmentMeans
          degreeOfEstablishment
        }
      }
    }
  }
`;

const TAXA_BY_WKT_QUERY = `
  query TaxaByWkt($wkt: String!, $first: Int, $page: Int) {
    taxonConceptsByWkt(wkt: $wkt, first: $first, page: $page) {
      paginatorInfo {
        count
        currentPage
        hasMorePages
        total
      }
      data {
        ${TAXON_FIELDS}
      }
    }
  }
`;

const GLOSSARY_BY_NAME_QUERY = `
  query GlossaryByName($name: String!) {
    glossaryTermsByName(name: $name) {
      id
      name
      definition
      isDiscouraged
      language
      nameAddendum
    }
  }
`;

const GLOSSARY_IN_TEXT_QUERY = `
  query GlossaryInText($text: String!) {
    glossaryTermsInString(string: $text) {
      substring
      term {
        id
        name
        definition
        isDiscouraged
        language
        nameAddendum
      }
    }
  }
`;

export class VicFloraProvider implements BotanyProvider {
  private readonly cache = new TtlCache<unknown>(config.vicfloraCacheTtlMs);

  async searchTaxa(query: string, limit: number): Promise<PlantSearchResult> {
    const data = await this.graphql<{ taxonConceptAutocomplete: VicFloraTaxonConcept[] }>(
      "SearchTaxa",
      SEARCH_TAXA_QUERY,
      { q: query }
    );

    const autocompleteMatches = (data.taxonConceptAutocomplete ?? [])
      .slice(0, limit)
      .map((taxon) => this.toTaxon(taxon));

    if (autocompleteMatches.length > 0) {
      return {
        query,
        matches: autocompleteMatches,
        metadata: this.metadata("taxonConceptAutocomplete")
      };
    }

    const fullTextMatches = await this.searchTaxaFullText(query, limit);

    return {
      query,
      matches: fullTextMatches,
      metadata: this.metadata("taxonConceptAutocomplete + search")
    };
  }

  async getTaxonProfile(input: { taxonConceptId?: string; name?: string }): Promise<PlantProfile> {
    const taxonConceptId = input.taxonConceptId ?? (await this.findBestTaxonId(input.name));
    if (!taxonConceptId) {
      throw new Error("Provide taxonConceptId or a name that resolves to a VicFlora taxon concept.");
    }

    const data = await this.graphql<{
      taxonConcept: VicFloraTaxonConcept | null;
      taxonConceptProfiles: Array<{
        profile?: string;
        modified?: string;
        updatedAt?: string;
        source?: ProfileReference | null;
      }>;
      taxonConceptPhenology: Array<{
        month: string;
        total: number;
        buds: number;
        flowers: number;
        fruit: number;
      }>;
      taxonConceptImages: {
        data: PlantProfile["images"];
      };
    }>("TaxonProfile", TAXON_PROFILE_QUERY, { id: taxonConceptId });

    if (!data.taxonConcept) {
      throw new Error(`No VicFlora taxon concept found for ${taxonConceptId}.`);
    }

    const currentProfile = data.taxonConceptProfiles?.[0];

    return {
      taxon: this.toTaxon(data.taxonConcept),
      acceptedTaxon: data.taxonConcept.acceptedConcept
        ? this.toTaxon(data.taxonConcept.acceptedConcept)
        : undefined,
      profileText: currentProfile?.profile,
      profileModified: currentProfile?.modified ?? currentProfile?.updatedAt,
      classification: (data.taxonConcept.higherClassification ?? []).map((taxon) => this.toTaxon(taxon)),
      synonyms: (data.taxonConcept.synonyms ?? []).map((name) => ({
        id: name.id,
        fullName: name.fullName ?? "",
        fullNameWithAuthorship: name.fullNameWithAuthorship,
        authorship: name.authorship
      })),
      phenology: data.taxonConceptPhenology ?? [],
      images: data.taxonConceptImages?.data ?? [],
      references: (data.taxonConceptProfiles ?? [])
        .map((profile) => profile.source)
        .filter((source): source is ProfileReference => Boolean(source)),
      metadata: this.metadata("taxonConcept + taxonConceptProfiles + taxonConceptPhenology + taxonConceptImages")
    };
  }

  async getOccurrences(input: {
    latitude: number;
    longitude: number;
    distanceDegrees: number;
    limit: number;
    taxonConceptId?: string;
    taxonName?: string;
  }): Promise<OccurrenceResult> {
    if (input.taxonConceptId || input.taxonName) {
      const taxonConceptId = input.taxonConceptId ?? (await this.findBestTaxonId(input.taxonName));
      if (!taxonConceptId) {
        throw new Error(`No VicFlora taxon concept found for ${input.taxonName}.`);
      }

      const [taxonSearch, data] = await Promise.all([
        this.getTaxonSummaryById(taxonConceptId).catch(() => undefined),
        this.graphql<{
          taxonOccurrencesAtPoint: {
            paginatorInfo?: OccurrenceResult["paginatorInfo"];
            data: Array<{ properties: OccurrenceResult["occurrences"][number] }>;
          };
        }>("OccurrencesAtPoint", OCCURRENCES_AT_POINT_QUERY, {
          taxonConceptId,
          latitude: input.latitude,
          longitude: input.longitude,
          distance: input.distanceDegrees,
          first: input.limit,
          page: 1
        })
      ]);

      return {
        taxon: taxonSearch,
        query: { ...input, taxonConceptId },
        note:
          "VicFlora occurrence records are evidence records. A sparse or empty result should not be interpreted as proof that the plant is absent.",
        paginatorInfo: data.taxonOccurrencesAtPoint?.paginatorInfo,
        occurrences: (data.taxonOccurrencesAtPoint?.data ?? []).map((item) => item.properties),
        metadata: this.metadata("taxonOccurrencesAtPoint")
      };
    }

    const wkt = `POINT(${input.longitude} ${input.latitude})`;
    const data = await this.graphql<{
      taxonConceptsByWkt: {
        paginatorInfo?: OccurrenceResult["paginatorInfo"];
        data: VicFloraTaxonConcept[];
      };
    }>("TaxaByWkt", TAXA_BY_WKT_QUERY, {
      wkt,
      first: input.limit,
      page: 1
    });

    return {
      query: input,
      note:
        "No taxon filter was provided, so this returns taxa VicFlora associates with the point geometry rather than specimen-level occurrence records. Empty results are not proof of absence.",
      paginatorInfo: data.taxonConceptsByWkt?.paginatorInfo,
      occurrences: (data.taxonConceptsByWkt?.data ?? []).map((taxon) => ({
        uuid: taxon.id,
        scientificName: taxon.taxonName?.fullNameWithAuthorship ?? taxon.taxonName?.fullName,
        speciesName: taxon.taxonName?.fullName,
        decimalLatitude: input.latitude,
        decimalLongitude: input.longitude,
        occurrenceStatus: taxon.occurrenceStatus,
        establishmentMeans: taxon.establishmentMeans,
        degreeOfEstablishment: taxon.degreeOfEstablishment
      })),
      metadata: this.metadata("taxonConceptsByWkt")
    };
  }

  async getGlossaryTerms(input: { query: string; mode: "name" | "text" }): Promise<GlossaryResult> {
    if (input.mode === "text") {
      const data = await this.graphql<{
        glossaryTermsInString: Array<{
          substring?: string;
          term?: GlossaryResult["matches"][number];
        }>;
      }>("GlossaryInText", GLOSSARY_IN_TEXT_QUERY, { text: input.query });

      return {
        query: input.query,
        mode: input.mode,
        matches: (data.glossaryTermsInString ?? []).map((match) => ({
          substring: match.substring,
          ...(match.term ?? { name: match.substring ?? "" })
        })),
        metadata: this.metadata("glossaryTermsInString")
      };
    }

    const data = await this.graphql<{ glossaryTermsByName: GlossaryResult["matches"] }>(
      "GlossaryByName",
      GLOSSARY_BY_NAME_QUERY,
      { name: input.query }
    );

    return {
      query: input.query,
      mode: input.mode,
      matches: data.glossaryTermsByName ?? [],
      metadata: this.metadata("glossaryTermsByName")
    };
  }

  private async findBestTaxonId(name: string | undefined): Promise<string | undefined> {
    if (!name) {
      return undefined;
    }

    const result = await this.searchTaxa(name, 10);
    const normalized = name.trim().toLowerCase();
    return (
      result.matches.find((match) => match.scientificName.toLowerCase() === normalized)?.id ??
      result.matches.find((match) => this.commonNames(match).some((commonName) => commonName === normalized))?.id ??
      result.matches.find((match) => match.scientificName.toLowerCase().includes(normalized))?.id ??
      result.matches.find((match) => this.commonNames(match).some((commonName) => commonName.includes(normalized)))?.id ??
      result.matches[0]?.id
    );
  }

  private async getTaxonSummaryById(id: string): Promise<TaxonSummary | undefined> {
    const profile = await this.getTaxonProfile({ taxonConceptId: id });
    return profile.taxon;
  }

  private toTaxon(taxon: VicFloraTaxonConcept): TaxonSummary {
    const commonNames = (taxon.vernacularNames ?? [])
      .map((name) => name.name)
      .filter((name): name is string => Boolean(name));

    const preferredCommonName = taxon.preferredVernacularName?.name;

    return {
      id: String(taxon.id),
      scientificName: taxon.taxonName?.fullName ?? String(taxon.id),
      scientificNameWithAuthorship: taxon.taxonName?.fullNameWithAuthorship,
      authorship: taxon.taxonName?.authorship,
      rank: taxon.taxonRank,
      taxonomicStatus: taxon.taxonomicStatus,
      occurrenceStatus: taxon.occurrenceStatus,
      establishmentMeans: taxon.establishmentMeans,
      degreeOfEstablishment: taxon.degreeOfEstablishment,
      endemic: taxon.endemic,
      preferredCommonName,
      commonNames: preferredCommonName && !commonNames.includes(preferredCommonName)
        ? [preferredCommonName, ...commonNames]
        : commonNames,
      sourceUrl: this.taxonUrl(taxon.id)
    };
  }

  private async searchTaxaFullText(query: string, limit: number): Promise<TaxonSummary[]> {
    for (const queryVariant of this.searchQueryVariants(query)) {
      const data = await this.graphql<{
        search: {
          docs: VicFloraSearchDocument[];
        } | null;
      }>("SearchTaxaFullText", SEARCH_TAXA_FULLTEXT_QUERY, {
        input: {
          q: queryVariant,
          rows: limit,
          page: 1,
          facet: false
        }
      });

      const matches = (data.search?.docs ?? []).slice(0, limit).map((doc) => this.searchDocumentToTaxon(doc));
      if (matches.length > 0) {
        return matches;
      }
    }

    return [];
  }

  private searchQueryVariants(query: string) {
    const variants = [query];
    const normalized = query.trim();
    const singularized = this.singularizeLastWord(normalized);

    if (singularized && singularized.toLowerCase() !== normalized.toLowerCase()) {
      variants.push(singularized);
    }

    return variants;
  }

  private singularizeLastWord(query: string) {
    const parts = query.split(/\s+/);
    const lastWord = parts.at(-1);
    if (!lastWord) {
      return undefined;
    }

    let singular: string | undefined;
    if (lastWord.length > 4 && lastWord.toLowerCase().endsWith("ies")) {
      singular = `${lastWord.slice(0, -3)}y`;
    } else if (lastWord.length > 3 && /s$/i.test(lastWord) && !/ss$/i.test(lastWord)) {
      singular = lastWord.slice(0, -1);
    }

    if (!singular) {
      return undefined;
    }

    return [...parts.slice(0, -1), singular].join(" ");
  }

  private searchDocumentToTaxon(doc: VicFloraSearchDocument): TaxonSummary {
    const commonNames = (doc.vernacularName ?? []).filter((name): name is string => Boolean(name));
    const preferredCommonName = doc.preferredVernacularName ?? undefined;
    const authorship = doc.scientificNameAuthorship ?? undefined;
    const scientificName = doc.scientificName ?? String(doc.id);

    return {
      id: String(doc.id),
      scientificName,
      scientificNameWithAuthorship: authorship ? `${scientificName} ${authorship}` : scientificName,
      authorship,
      rank: doc.taxonRank?.toUpperCase(),
      taxonomicStatus: doc.taxonomicStatus?.toUpperCase(),
      occurrenceStatus: doc.occurrenceStatus?.toUpperCase(),
      establishmentMeans: doc.establishmentMeans?.toUpperCase(),
      degreeOfEstablishment: doc.degreeOfEstablishment?.toUpperCase(),
      endemic: doc.endemic ?? undefined,
      preferredCommonName,
      commonNames: preferredCommonName && !commonNames.includes(preferredCommonName)
        ? [preferredCommonName, ...commonNames]
        : commonNames,
      sourceUrl: this.taxonUrl(doc.id)
    };
  }

  private commonNames(taxon: TaxonSummary) {
    return [taxon.preferredCommonName, ...taxon.commonNames]
      .filter((name): name is string => Boolean(name))
      .map((name) => name.toLowerCase());
  }

  private metadata(operation: string): SourceMetadata {
    return {
      provider: "VicFlora",
      source: "VicFlora GraphQL API",
      sourceUrl: config.vicfloraGraphqlEndpoint,
      retrievedAt: new Date().toISOString(),
      operation
    };
  }

  private taxonUrl(id: string) {
    return `https://vicflora.rbg.vic.gov.au/flora/taxon/${id}`;
  }

  private async graphql<T>(
    operationName: string,
    query: string,
    variables: Record<string, unknown>
  ): Promise<T> {
    const cacheKey = JSON.stringify({ operationName, variables });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as T;
    }

    const response = await this.fetchWithRetry<T>(operationName, query, variables);
    this.cache.set(cacheKey, response);
    return response;
  }

  private async fetchWithRetry<T>(
    operationName: string,
    query: string,
    variables: Record<string, unknown>
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.vicfloraTimeoutMs);

      try {
        const response = await fetch(config.vicfloraGraphqlEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "botany-mcp/0.1"
          },
          body: JSON.stringify({ operationName, query, variables }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`VicFlora returned HTTP ${response.status}`);
        }

        const body = (await response.json()) as GraphqlResponse<T>;

        if (body.errors?.length) {
          throw new Error(body.errors.map((error) => error.message).join("; "));
        }

        if (!body.data) {
          throw new Error("VicFlora returned no data.");
        }

        return body.data;
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
