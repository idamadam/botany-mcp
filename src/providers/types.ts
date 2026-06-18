export type SourceMetadata = {
  provider: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  operation: string;
};

export type TaxonSummary = {
  id: string;
  scientificName: string;
  scientificNameWithAuthorship?: string;
  authorship?: string;
  rank?: string;
  taxonomicStatus?: string;
  occurrenceStatus?: string;
  establishmentMeans?: string;
  degreeOfEstablishment?: string;
  endemic?: boolean;
  preferredCommonName?: string;
  commonNames: string[];
  sourceUrl: string;
};

export type PlantSearchResult = {
  query: string;
  matches: TaxonSummary[];
  metadata: SourceMetadata;
};

export type ProfileReference = {
  id?: string;
  title?: string;
  referenceString?: string;
  referenceStringMarkdown?: string;
  doi?: string;
};

export type PlantProfile = {
  taxon: TaxonSummary;
  acceptedTaxon?: TaxonSummary;
  profileText?: string;
  profileModified?: string;
  classification: TaxonSummary[];
  synonyms: Array<{
    id?: string;
    fullName: string;
    fullNameWithAuthorship?: string;
    authorship?: string;
  }>;
  phenology: Array<{
    month: string;
    total: number;
    buds: number;
    flowers: number;
    fruit: number;
  }>;
  images: Array<{
    id: string;
    title?: string;
    caption?: string;
    creator?: string;
    license?: string | null;
    thumbnailUrl?: string;
    thumbnailSourceUrl?: string;
    previewUrl?: string;
    previewSourceUrl?: string;
    heroImage?: boolean;
    subjectCategory?: string | null;
    type?: string | null;
    subtype?: string | null;
    rating?: number | null;
    pixelXDimension?: number | null;
    pixelYDimension?: number | null;
  }>;
  references: ProfileReference[];
  metadata: SourceMetadata;
};

export type OccurrenceResult = {
  taxon?: TaxonSummary;
  query: {
    latitude: number;
    longitude: number;
    distanceDegrees: number;
    limit: number;
    taxonConceptId?: string;
    taxonName?: string;
  };
  note: string;
  paginatorInfo?: {
    count: number;
    currentPage: number;
    hasMorePages: boolean;
    total: number;
  };
  occurrences: Array<{
    uuid: string;
    scientificName?: string;
    speciesName?: string;
    eventDate?: string;
    recordedBy?: string;
    recordNumber?: string;
    catalogNumber?: string;
    collection?: string;
    dataSource?: string;
    decimalLatitude?: number;
    decimalLongitude?: number;
    occurrenceStatus?: string;
    establishmentMeans?: string;
    degreeOfEstablishment?: string;
  }>;
  metadata: SourceMetadata;
};

export type GlossaryResult = {
  query: string;
  mode: "name" | "text";
  matches: Array<{
    substring?: string;
    id?: string;
    name: string;
    definition?: string;
    language?: string;
    isDiscouraged?: boolean;
    nameAddendum?: string;
  }>;
  metadata: SourceMetadata;
};

export type PlantLearningImage = {
  url: string;
  sourceUrl?: string;
  caption?: string;
  creator?: string;
  license?: string;
  focus?: string;
  displayLabel?: string;
  group?: "habit" | "flowers" | "fruit" | "details";
};

export type PlantLearningProfile = {
  query: {
    name: string;
    region: "VIC";
  };
  displayName: string;
  scientificName: string;
  scientificNameWithAuthorship?: string;
  family?: string;
  groupLabel?: string;
  spotIt: {
    oneLiner?: string;
    fieldMarks: string[];
    heroImage?: PlantLearningImage;
  };
  inVictoria: {
    statusLabel: string;
    where?: string;
    when?: string;
    conservation?: string;
  };
  detail: {
    fullDescription?: string;
    nationalRange?: string;
    nationalHabitat?: string;
    confusionNotes?: string;
  };
  media: {
    gallery: PlantLearningImage[];
    groups?: {
      habit: PlantLearningImage[];
      flowers: PlantLearningImage[];
      fruit: PlantLearningImage[];
      details: PlantLearningImage[];
    };
  };
  naming: {
    commonNames: string[];
    alsoKnownAs: string[];
    synonyms?: string[];
  };
  references: Array<{
    label: string;
    source: string;
    url?: string;
  }>;
  sources: Array<{
    source: string;
    role: string;
    present: boolean;
    summary: string;
    url?: string;
    iconUrl?: string;
  }>;
  rawSources: {
    vicflora?: PlantProfile;
    alaTaxon?: unknown;
    alaFloraProfile?: unknown;
  };
  metadata: SourceMetadata;
  warnings: string[];
};

export interface BotanyProvider {
  searchTaxa(query: string, limit: number): Promise<PlantSearchResult>;
  getTaxonProfile(input: { taxonConceptId?: string; name?: string }): Promise<PlantProfile>;
  getOccurrences(input: {
    latitude: number;
    longitude: number;
    distanceDegrees: number;
    limit: number;
    taxonConceptId?: string;
    taxonName?: string;
  }): Promise<OccurrenceResult>;
  getGlossaryTerms(input: { query: string; mode: "name" | "text" }): Promise<GlossaryResult>;
}
