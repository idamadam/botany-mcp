import { AlaFloraProfile, AlaProvider, AlaTaxon } from "./providers/ala.js";
import { BotanyProvider, PlantLearningProfile, PlantProfile, SourceMetadata } from "./providers/types.js";

type AlaDataProvider = Pick<AlaProvider, "resolveTaxon" | "getFloraProfile">;

type VicFloraSections = {
  description?: string;
  phenology?: string;
  distributionAustralia?: string;
  habitat?: string;
  note?: string;
};

const SOURCE_URL = "botany://learning-profile";

const htmlEntities: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&ndash;": "-",
  "&mdash;": "-",
  "&times;": "x",
  "&#39;": "'",
  "&quot;": "\""
};

const decodeEntities = (value: string) =>
  Object.entries(htmlEntities).reduce((text, [entity, replacement]) => text.replaceAll(entity, replacement), value);

const htmlToText = (value: string | undefined) =>
  decodeEntities(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const firstSentence = (value: string | undefined) => {
  const text = value?.trim();
  if (!text) {
    return undefined;
  }

  const match = text.match(/^(.{30,220}?[.!?])\s/);
  return match?.[1] ?? text.slice(0, 220);
};

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

const extractVicFloraSections = (profileText: string | undefined): VicFloraSections => {
  const sections: Record<string, string[]> = {};
  const pattern = /<p\s+class="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(profileText ?? ""))) {
    const key = match[1].replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    sections[key] = [...(sections[key] ?? []), htmlToText(match[2])];
  }

  return {
    description: sections.description?.join("\n\n"),
    phenology: sections.phenology?.join("\n\n"),
    distributionAustralia: sections.distributionAustralia?.join("\n\n"),
    habitat: sections.habitat?.join("\n\n"),
    note: sections.note?.join("\n\n")
  };
};

const attr = (profile: AlaFloraProfile | undefined, title: string) => {
  if (!profile) {
    return undefined;
  }

  const exact = profile.attributeMap[title];
  if (exact?.trim()) {
    return exact.trim();
  }

  const lowerTitle = title.toLowerCase();
  return profile.attributes.find((attribute) => attribute.title.toLowerCase() === lowerTitle)?.plainText?.trim();
};

const sourceMetadata = (): SourceMetadata => ({
  provider: "Botany MCP",
  source: "Combined VicFlora and ALA learning profile",
  sourceUrl: SOURCE_URL,
  retrievedAt: new Date().toISOString(),
  operation: "learning profile"
});

const citationFromReference = (reference: PlantProfile["references"][number]) => ({
  label: reference.title ?? "VicFlora reference",
  source: reference.referenceStringMarkdown ?? reference.referenceString ?? reference.title ?? "VicFlora reference",
  url: reference.doi ? `https://doi.org/${reference.doi}` : undefined
});

export class PlantLearningService {
  constructor(
    private readonly vicflora: BotanyProvider,
    private readonly ala: AlaDataProvider
  ) {}

  async getLearningProfile(input: { name: string; region?: "VIC" }): Promise<PlantLearningProfile> {
    const warnings: string[] = [];
    const region = input.region ?? "VIC";

    const vicfloraProfile = await this.vicflora.getTaxonProfile({ name: input.name }).catch((error: unknown) => {
      warnings.push(`VicFlora profile unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    });

    const resolvedName = vicfloraProfile?.taxon.scientificName ?? input.name;
    const [alaTaxonResult, alaFloraProfileResult] = await Promise.all([
      this.ala.resolveTaxon(resolvedName).catch((error: unknown) => {
        warnings.push(`ALA BIE taxon unavailable: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
      }),
      this.ala.getFloraProfile(resolvedName).catch((error: unknown) => {
        warnings.push(`ALA Flora of Australia profile unavailable: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
      })
    ]);

    const alaTaxon = alaTaxonResult?.taxon;
    const alaFloraProfile = alaFloraProfileResult?.profile;
    const vicSections = extractVicFloraSections(vicfloraProfile?.profileText);

    const scientificName = vicfloraProfile?.taxon.scientificName ??
      alaFloraProfile?.scientificName ??
      alaTaxon?.scientificName ??
      input.name;
    const scientificNameWithAuthorship = vicfloraProfile?.taxon.scientificNameWithAuthorship ??
      alaFloraProfile?.fullName ??
      alaTaxon?.scientificNameWithAuthorship;
    const commonNames = unique([
      vicfloraProfile?.taxon.preferredCommonName,
      ...(vicfloraProfile?.taxon.commonNames ?? []),
      alaTaxon?.commonNameSingle,
      ...(alaTaxon?.commonNames ?? []),
      attr(alaFloraProfile, "Common Name")?.split(",").map((name) => name.trim()).join("|")
    ].flatMap((value) => value?.includes("|") ? value.split("|") : value));

    return {
      query: {
        name: input.name,
        region
      },
      displayName: vicfloraProfile?.taxon.preferredCommonName ??
        alaTaxon?.commonNameSingle ??
        commonNames[0] ??
        scientificName,
      scientificName,
      scientificNameWithAuthorship,
      commonNames,
      heroImage: this.heroImage(vicfloraProfile, alaTaxon),
      recognition: {
        summary: firstSentence(attr(alaFloraProfile, "Diagnostic Features") ?? vicSections.description ?? attr(alaFloraProfile, "Description")),
        diagnosticFeatures: attr(alaFloraProfile, "Diagnostic Features"),
        description: attr(alaFloraProfile, "Description") ?? vicSections.description
      },
      status: {
        victorian: vicfloraProfile?.taxon.occurrenceStatus,
        establishmentMeans: vicfloraProfile?.taxon.establishmentMeans,
        degreeOfEstablishment: vicfloraProfile?.taxon.degreeOfEstablishment,
        nationalBiostatus: attr(alaFloraProfile, "Biostatus"),
        conservation: attr(alaFloraProfile, "Conservation Status") ?? alaTaxon?.conservationStatus ?? undefined
      },
      distribution: {
        victoria: vicSections.habitat,
        national: attr(alaFloraProfile, "Distribution") ?? vicSections.distributionAustralia
      },
      habitat: {
        victoria: vicSections.habitat,
        national: attr(alaFloraProfile, "Habitat")
      },
      similarityNotes: attr(alaFloraProfile, "Taxonomic Notes") ?? vicSections.note,
      sourceComparison: this.sourceComparison(vicfloraProfile, alaTaxon, alaFloraProfile),
      citations: this.citations(vicfloraProfile, alaTaxon, alaFloraProfile),
      rawSources: {
        vicflora: vicfloraProfile,
        alaTaxon,
        alaFloraProfile
      },
      metadata: sourceMetadata(),
      warnings
    };
  }

  private heroImage(profile: PlantProfile | undefined, alaTaxon: AlaTaxon | undefined): PlantLearningProfile["heroImage"] {
    const vicImage = profile?.images[0];
    if (vicImage?.previewUrl || vicImage?.thumbnailUrl) {
      return {
        url: vicImage.previewUrl ?? vicImage.thumbnailUrl ?? "",
        sourceUrl: vicImage.previewSourceUrl ?? vicImage.thumbnailSourceUrl,
        caption: htmlToText(vicImage.caption),
        creator: vicImage.creator,
        license: vicImage.license
      };
    }

    if (alaTaxon?.imageUrl || alaTaxon?.thumbnailUrl) {
      return {
        url: alaTaxon.imageUrl ?? alaTaxon.thumbnailUrl ?? "",
        sourceUrl: alaTaxon.imageSourceUrl ?? alaTaxon.thumbnailSourceUrl,
        caption: alaTaxon.commonNameSingle ?? alaTaxon.scientificName
      };
    }

    return undefined;
  }

  private sourceComparison(
    vicfloraProfile: PlantProfile | undefined,
    alaTaxon: AlaTaxon | undefined,
    alaFloraProfile: AlaFloraProfile | undefined
  ): PlantLearningProfile["sourceComparison"] {
    return [
      {
        source: "VicFlora",
        role: "Victorian authority",
        present: Boolean(vicfloraProfile),
        summary: vicfloraProfile
          ? "Provides Victorian taxon concept, local status, profile text, phenology, images, and references."
          : "No VicFlora profile was available for this query."
      },
      {
        source: "ALA BIE",
        role: "National taxon identity",
        present: Boolean(alaTaxon),
        summary: alaTaxon
          ? "Provides APC-backed accepted taxon metadata, common names, identifiers, image pointers, and occurrence count."
          : "No ALA BIE taxon match was available for this query."
      },
      {
        source: "ALA Flora of Australia",
        role: "National authored treatment",
        present: Boolean(alaFloraProfile),
        summary: alaFloraProfile
          ? "Provides structured national flora attributes such as description, diagnostic features, distribution, habitat, and bibliography."
          : "No Flora of Australia profile was available for this query."
      }
    ];
  }

  private citations(
    vicfloraProfile: PlantProfile | undefined,
    alaTaxon: AlaTaxon | undefined,
    alaFloraProfile: AlaFloraProfile | undefined
  ): PlantLearningProfile["citations"] {
    return [
      ...(vicfloraProfile?.references ?? []).map(citationFromReference),
      ...(alaTaxon ? [{
        label: "ALA BIE species page",
        source: alaTaxon.infoSourceName ? `Atlas of Living Australia, ${alaTaxon.infoSourceName}` : "Atlas of Living Australia BIE",
        url: alaTaxon.sourceUrl
      }] : []),
      ...(alaFloraProfile ? [{
        label: alaFloraProfile.opusName ?? "Flora of Australia",
        source: [
          ...(alaFloraProfile.authorship.map((author) => author.text)),
          attr(alaFloraProfile, "Source")
        ].filter(Boolean).join("; "),
        url: alaFloraProfile.sourceUrl
      }] : [])
    ];
  }
}
