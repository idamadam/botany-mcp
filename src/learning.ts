import { config } from "./config.js";
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

const proxyFavicon = (pageUrl: string | undefined) => {
  if (!pageUrl) return undefined;

  try {
    const faviconUrl = new URL("/favicon.ico", new URL(pageUrl).origin).href;
    const proxyUrl = new URL(config.imageProxyPath, config.publicBaseUrl);
    proxyUrl.searchParams.set("url", faviconUrl);
    return proxyUrl.toString();
  } catch {
    return undefined;
  }
};

type ProfileImage = PlantProfile["images"][number];
type LearningImage = NonNullable<PlantLearningProfile["imageGallery"]>[number];

const DETAIL_IMAGE_PATTERN =
  /\b(section|capsule|seed|seeds|fruit|flower|flowers|microscop|longitudinal|cross[\s-]?section|transverse|fig\.?\s*\d|figure)\b/i;
const CLOSEUP_IMAGE_PATTERN =
  /\b(flg|flower|branch|brnch|leaf|leaves|bud|buds|fruit|inflorescence|close[\s-]?up|macro)\b/i;
const HABIT_IMAGE_PATTERN =
  /\b(old|mature|trunk|habit|whole|stand|woodland|forest|specimen|ancient|gnarled|tree|gum|wattle|big)\b/i;
const ILLUSTRATION_CATEGORY_PATTERN = /figure|illustration|drawing|line\s*art/i;

const imageHasUrl = (image: ProfileImage) => Boolean(image.previewUrl || image.thumbnailUrl);

const imageLabel = (image: ProfileImage) =>
  [image.title, htmlToText(image.caption)].filter(Boolean).join(" ");

const isIllustration = (image: ProfileImage) => {
  const category = image.subjectCategory?.trim();
  return Boolean(category && ILLUSTRATION_CATEGORY_PATTERN.test(category));
};

const isDetailShot = (image: ProfileImage) => DETAIL_IMAGE_PATTERN.test(imageLabel(image));

const isCloseUpShot = (image: ProfileImage) => CLOSEUP_IMAGE_PATTERN.test(imageLabel(image));

const isHeroCandidate = (image: ProfileImage) =>
  imageHasUrl(image) && !isIllustration(image) && !isDetailShot(image) && !isCloseUpShot(image);

const heroCandidateScore = (image: ProfileImage) => {
  const label = imageLabel(image).toLowerCase();
  let score = 0;

  if (HABIT_IMAGE_PATTERN.test(label)) score += 140;
  if (CLOSEUP_IMAGE_PATTERN.test(label)) score -= 120;
  if (DETAIL_IMAGE_PATTERN.test(label)) score -= 120;
  if (image.heroImage) score += 20;

  if (image.rating) score += image.rating * 8;

  const width = image.pixelXDimension ?? 0;
  const height = image.pixelYDimension ?? 0;
  if (width > height * 1.15) score += 70;
  else if (height > width * 1.3) score -= 50;

  if (width * height > 8_000_000) score += 10;

  return score;
};

const toLearningImage = (image: ProfileImage): LearningImage => ({
  url: image.previewUrl ?? image.thumbnailUrl ?? "",
  sourceUrl: image.previewSourceUrl ?? image.thumbnailSourceUrl,
  caption: htmlToText(image.caption),
  creator: image.creator,
  license: image.license ?? undefined,
  focus: image.title?.trim() || undefined
});

const pickHeroImage = (
  images: ProfileImage[],
  alaTaxon: AlaTaxon | undefined
): PlantLearningProfile["heroImage"] => {
  const candidates = images.filter(isHeroCandidate);
  const selected =
    candidates.sort((left, right) => heroCandidateScore(right) - heroCandidateScore(left))[0] ??
    images.find(imageHasUrl);

  if (selected) {
    const learningImage = toLearningImage(selected);
    return {
      url: learningImage.url,
      sourceUrl: learningImage.sourceUrl,
      caption: learningImage.caption,
      creator: learningImage.creator,
      license: learningImage.license
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
};

const buildImageGallery = (images: ProfileImage[]): PlantLearningProfile["imageGallery"] => {
  const gallery = images.filter(imageHasUrl).map(toLearningImage);
  return gallery.length > 0 ? gallery : undefined;
};

const orderGalleryWithHeroFirst = (
  gallery: PlantLearningProfile["imageGallery"],
  hero: PlantLearningProfile["heroImage"]
): PlantLearningProfile["imageGallery"] => {
  if (!gallery?.length || !hero?.url) {
    return gallery;
  }

  const heroIndex = gallery.findIndex((image) => image.url === hero.url);
  if (heroIndex < 0) {
    return gallery;
  }

  if (heroIndex === 0) {
    return gallery;
  }

  const reordered = [...gallery];
  const [heroItem] = reordered.splice(heroIndex, 1);
  reordered.unshift(heroItem);
  return reordered;
};

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

    const vicfloraImages = vicfloraProfile?.images ?? [];
    const heroImage = pickHeroImage(vicfloraImages, alaTaxon);

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
      heroImage,
      imageGallery: orderGalleryWithHeroFirst(buildImageGallery(vicfloraImages), heroImage),
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
          : "No VicFlora profile was available for this query.",
        url: vicfloraProfile?.taxon.sourceUrl,
        iconUrl: proxyFavicon(vicfloraProfile?.taxon.sourceUrl)
      },
      {
        source: "ALA BIE",
        role: "National taxon identity",
        present: Boolean(alaTaxon),
        summary: alaTaxon
          ? "Provides APC-backed accepted taxon metadata, common names, identifiers, image pointers, and occurrence count."
          : "No ALA BIE taxon match was available for this query.",
        url: alaTaxon?.sourceUrl,
        iconUrl: proxyFavicon(alaTaxon?.sourceUrl)
      },
      {
        source: "ALA Flora of Australia",
        role: "National authored treatment",
        present: Boolean(alaFloraProfile),
        summary: alaFloraProfile
          ? "Provides structured national flora attributes such as description, diagnostic features, distribution, habitat, and bibliography."
          : "No Flora of Australia profile was available for this query.",
        url: alaFloraProfile?.sourceUrl,
        iconUrl: proxyFavicon(alaFloraProfile?.sourceUrl)
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
