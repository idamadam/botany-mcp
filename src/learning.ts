import { config } from "./config.js";
import { AlaFloraProfile, AlaProvider, AlaTaxon } from "./providers/ala.js";
import {
  BotanyProvider,
  PlantLearningImage,
  PlantLearningProfile,
  PlantProfile,
  SourceMetadata,
  TaxonSummary
} from "./providers/types.js";

type AlaDataProvider = Pick<AlaProvider, "resolveTaxon" | "getFloraProfile">;

type VicFloraSections = {
  description?: string;
  phenology?: string;
  distributionAustralia?: string;
  habitat?: string;
  note?: string;
};

type ImageGroupKey = NonNullable<PlantLearningImage["group"]>;

const SOURCE_URL = "botany://learning-profile";

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const GENUS_GROUP_LABELS: Record<string, string> = {
  acacia: "Wattle",
  eucalyptus: "Eucalypt",
  banksia: "Banksia",
  melaleuca: "Paperbark",
  callistemon: "Bottlebrush",
  leptospermum: "Tea-tree",
  hakea: "Hakea",
  grevillea: "Grevillea"
};

const CONFUSION_PATTERN =
  /\b(confus|similar|distinguish|compare|differs? from|mistaken|lookalike|resembles?)\b/i;

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

const cleanCommonName = (name: string) =>
  name.trim().replace(/[.,;]+$/, "").trim();

const isUsefulCommonName = (name: string) => {
  const cleaned = cleanCommonName(name);
  if (cleaned.length < 4 || !/[a-z]/i.test(cleaned)) {
    return false;
  }

  const words = cleaned.split(/\s+/);
  return words.length >= 2 || cleaned.length >= 8;
};

const curateAlsoKnownAs = (
  names: string[],
  displayName: string,
  scientificName: string,
  limit = 5
) => {
  const skip = new Set([displayName, scientificName].map((value) => value.toLowerCase()));

  return unique(names.map(cleanCommonName).filter(isUsefulCommonName))
    .filter((name) => !skip.has(name.toLowerCase()))
    .filter((name, index, list) =>
      !list.some((other) =>
        other !== name &&
        other.toLowerCase() !== name.toLowerCase() &&
        other.toLowerCase().includes(name.toLowerCase()) &&
        other.length > name.length
      )
    )
    .slice(0, limit);
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

const DETAIL_IMAGE_PATTERN =
  /\b(section|capsule|seed|seeds|fruit|flower|flowers|microscop|longitudinal|cross[\s-]?section|transverse|fig\.?\s*\d|figure)\b/i;
const CLOSEUP_IMAGE_PATTERN =
  /\b(flg|flower|branch|brnch|leaf|leaves|bud|buds|fruit|inflorescence|close[\s-]?up|macro)\b/i;
const FLOWER_IMAGE_PATTERN = /\b(flg|flower|flowers|bud|buds|inflorescence)\b/i;
const FRUIT_IMAGE_PATTERN = /\b(fruit|capsule|seed|seeds|gumnut|pod|pods)\b/i;
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

const classifyImageGroup = (image: ProfileImage): ImageGroupKey => {
  const label = imageLabel(image).toLowerCase();

  if (isIllustration(image) || isDetailShot(image)) {
    return "details";
  }
  if (FLOWER_IMAGE_PATTERN.test(label)) {
    return "flowers";
  }
  if (FRUIT_IMAGE_PATTERN.test(label)) {
    return "fruit";
  }
  return "habit";
};

const GROUP_DISPLAY_LABELS: Record<ImageGroupKey, string> = {
  habit: "Whole plant",
  flowers: "Flowers",
  fruit: "Fruit or seeds",
  details: "Close-up detail"
};

const learnerDisplayLabel = (image: ProfileImage, group: ImageGroupKey) => {
  const caption = htmlToText(image.caption);
  if (caption && caption.length <= 80 && !caption.includes(">")) {
    return caption;
  }
  return GROUP_DISPLAY_LABELS[group];
};

const toLearningImage = (image: ProfileImage, group?: ImageGroupKey): PlantLearningImage => {
  const resolvedGroup = group ?? classifyImageGroup(image);
  return {
    url: image.previewUrl ?? image.thumbnailUrl ?? "",
    sourceUrl: image.previewSourceUrl ?? image.thumbnailSourceUrl,
    caption: htmlToText(image.caption),
    creator: image.creator,
    license: image.license ?? undefined,
    focus: image.title?.trim() || undefined,
    group: resolvedGroup,
    displayLabel: learnerDisplayLabel(image, resolvedGroup)
  };
};

const pickHeroImage = (
  images: ProfileImage[],
  alaTaxon: AlaTaxon | undefined
): PlantLearningProfile["spotIt"]["heroImage"] => {
  const candidates = images.filter(isHeroCandidate);
  const selected =
    candidates.sort((left, right) => heroCandidateScore(right) - heroCandidateScore(left))[0] ??
    images.find(imageHasUrl);

  if (selected) {
    return toLearningImage(selected, "habit");
  }

  if (alaTaxon?.imageUrl || alaTaxon?.thumbnailUrl) {
    return {
      url: alaTaxon.imageUrl ?? alaTaxon.thumbnailUrl ?? "",
      sourceUrl: alaTaxon.imageSourceUrl ?? alaTaxon.thumbnailSourceUrl,
      caption: alaTaxon.commonNameSingle ?? alaTaxon.scientificName,
      group: "habit",
      displayLabel: "Whole plant"
    };
  }

  return undefined;
};

const buildImageGallery = (images: ProfileImage[]): PlantLearningImage[] =>
  images.filter(imageHasUrl).map((image) => toLearningImage(image));

const orderGalleryWithHeroFirst = (
  gallery: PlantLearningImage[],
  hero?: PlantLearningImage
): PlantLearningImage[] => {
  if (!gallery.length || !hero?.url) {
    return gallery;
  }

  const heroIndex = gallery.findIndex((image) => image.url === hero.url);
  if (heroIndex <= 0) {
    return gallery;
  }

  const reordered = [...gallery];
  const [heroItem] = reordered.splice(heroIndex, 1);
  reordered.unshift(heroItem);
  return reordered;
};

const groupGalleryImages = (gallery: PlantLearningImage[]) => {
  const groups: NonNullable<PlantLearningProfile["media"]["groups"]> = {
    habit: [],
    flowers: [],
    fruit: [],
    details: []
  };

  for (const image of gallery) {
    const key = image.group ?? "habit";
    groups[key].push(image);
  }

  const hasGroupedContent = Object.values(groups).some((items) => items.length > 0);
  return hasGroupedContent ? groups : undefined;
};

const openingSentence = (value: string | undefined) => {
  const text = value?.trim();
  if (!text) {
    return undefined;
  }

  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  return match?.[1] ?? text;
};

const normalizePhrase = (value: string) =>
  value.toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();

const phrasesOverlap = (left: string, right: string) => {
  if (!left || !right) {
    return false;
  }
  return left === right || left.includes(right) || right.includes(left);
};

const parseFieldMarks = (diagnostic?: string, description?: string, oneLiner?: string) => {
  const source = diagnostic?.trim() || description?.trim();
  if (!source) {
    return [];
  }

  let remainder = source;
  if (oneLiner) {
    const openingMatch = source.match(/^(.+?[.!?])(?:\s|$)/);
    if (openingMatch) {
      remainder = source.slice(openingMatch[0].length).trim();
    }
  }

  const segments = (remainder || source)
    .split(/(?:;|\.\s+|\n+)/)
    .flatMap((segment) => segment.split(/,\s+and\s+|,\s+(?=[A-Z])/))
    .map((segment) => segment.replace(/^and\s+/i, "").replace(/^[,.;:\s]+/, "").trim())
    .filter((segment) => segment.length >= 8);

  const oneLinerNorm = oneLiner ? normalizePhrase(oneLiner) : "";

  return unique(segments)
    .filter((segment) => !phrasesOverlap(normalizePhrase(segment), oneLinerNorm))
    .slice(0, 6);
};

const humanizeStatus = (
  occurrenceStatus: string | undefined,
  establishmentMeans: string | undefined,
  endemic?: boolean
) => {
  const occurrence = occurrenceStatus?.toUpperCase();
  const establishment = establishmentMeans?.toUpperCase();

  if (occurrence === "ABSENT") {
    return "Not recorded in Victoria";
  }

  const parts: string[] = [];

  if (establishment === "NATIVE" || establishment === "INDIGENOUS") {
    parts.push(endemic ? "Native and endemic to Victoria" : "Native to Victoria");
  } else if (establishment === "NATURALISED" || establishment === "NATURALIZED") {
    parts.push("Naturalised in Victoria");
  } else if (establishment === "EXOTIC" || establishment === "INTRODUCED") {
    parts.push("Introduced to Victoria");
  } else if (establishment) {
    parts.push(establishment.charAt(0) + establishment.slice(1).toLowerCase().replaceAll("_", " "));
  }

  if (occurrence === "PRESENT" && parts.length === 0) {
    parts.push("Present in Victoria");
  } else if (occurrence === "DOUBTFUL") {
    parts.push("presence uncertain in Victoria");
  } else if (occurrence && parts.length === 0) {
    parts.push(`Recorded as ${occurrence.toLowerCase().replaceAll("_", " ")} in Victoria`);
  }

  return parts.length > 0 ? parts.join(", ") : "Status unavailable";
};

const mergeWhereText = (...parts: Array<string | undefined>) => {
  const values = unique(parts);
  if (values.length === 0) {
    return undefined;
  }
  if (values.length === 1) {
    return values[0];
  }

  const [first, second] = values;
  if (first && second && (first.includes(second) || second.includes(first))) {
    return first.length >= second.length ? first : second;
  }

  return values.join(" ");
};

const monthIndex = (month: string) => {
  const normalized = month.trim().slice(0, 3).toLowerCase();
  return MONTH_ORDER.findIndex((candidate) => candidate.toLowerCase() === normalized);
};

const formatMonthRange = (months: string[]) => {
  const indices = [...new Set(months.map((month) => monthIndex(month)).filter((index) => index >= 0))].sort(
    (left, right) => left - right
  );

  if (indices.length === 0) {
    return undefined;
  }
  if (indices.length === 1) {
    return MONTH_ORDER[indices[0]];
  }

  let maxGap = 0;
  let gapAfter = -1;
  for (let index = 0; index < indices.length; index += 1) {
    const current = indices[index];
    const next = index === indices.length - 1 ? indices[0] + 12 : indices[index + 1];
    const gap = next - current;
    if (gap > maxGap) {
      maxGap = gap;
      gapAfter = index;
    }
  }

  if (maxGap > 1 && gapAfter >= 0) {
    const start = indices[(gapAfter + 1) % indices.length];
    const end = indices[gapAfter];
    return `${MONTH_ORDER[start]}–${MONTH_ORDER[end]}`;
  }

  return `${MONTH_ORDER[indices[0]]}–${MONTH_ORDER[indices[indices.length - 1]]}`;
};

const formatPhenology = (
  phenology: PlantProfile["phenology"],
  phenologyText?: string
) => {
  if (phenologyText?.trim()) {
    return phenologyText.trim();
  }

  const floweringMonths = phenology.filter((entry) => entry.flowers > 0).map((entry) => entry.month);
  const fruitingMonths = phenology.filter((entry) => entry.fruit > 0).map((entry) => entry.month);
  const buddingMonths = phenology.filter((entry) => entry.buds > 0).map((entry) => entry.month);

  const parts: string[] = [];
  const flowers = formatMonthRange(floweringMonths);
  const fruit = formatMonthRange(fruitingMonths);
  const buds = formatMonthRange(buddingMonths);

  if (flowers) parts.push(`Flowers mainly ${flowers}`);
  if (fruit) parts.push(`Fruit mainly ${fruit}`);
  if (!flowers && buds) parts.push(`Buds mainly ${buds}`);

  return parts.length > 0 ? parts.join(". ") : undefined;
};

const pickConfusionNotes = (taxonomicNotes?: string, vicNote?: string) => {
  if (taxonomicNotes && CONFUSION_PATTERN.test(taxonomicNotes)) {
    return taxonomicNotes;
  }
  if (vicNote && (CONFUSION_PATTERN.test(vicNote) || /\b(only|Victoria|subspecies)\b/i.test(vicNote))) {
    return vicNote;
  }
  return undefined;
};

const classificationFamily = (
  vicfloraClassification: TaxonSummary[],
  alaTaxon: AlaTaxon | undefined
) => {
  const vicFamily = vicfloraClassification.find((taxon) => taxon.rank?.toUpperCase() === "FAMILY");
  if (vicFamily?.scientificName) {
    return vicFamily.scientificName;
  }

  return alaTaxon?.classification.find((taxon) => taxon.rank.toLowerCase() === "family")?.name;
};

const classificationGenus = (
  scientificName: string,
  vicfloraClassification: TaxonSummary[],
  alaTaxon: AlaTaxon | undefined
) => {
  const vicGenus = vicfloraClassification.find((taxon) => taxon.rank?.toUpperCase() === "GENUS");
  if (vicGenus?.scientificName) {
    return vicGenus.scientificName;
  }

  const alaGenus = alaTaxon?.classification.find((taxon) => taxon.rank.toLowerCase() === "genus")?.name;
  if (alaGenus) {
    return alaGenus;
  }

  return scientificName.split(/\s+/)[0];
};

const groupLabelFromGenus = (genus?: string) => {
  if (!genus) {
    return undefined;
  }
  return GENUS_GROUP_LABELS[genus.toLowerCase()] ?? genus;
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
    ].flatMap((value) => value?.includes("|") ? value.split("|") : value))
      .map(cleanCommonName)
      .filter(isUsefulCommonName);

    const diagnosticFeatures = attr(alaFloraProfile, "Diagnostic Features");
    const description = attr(alaFloraProfile, "Description") ?? vicSections.description;
    const oneLiner = openingSentence(diagnosticFeatures ?? description);
    const vicfloraImages = vicfloraProfile?.images ?? [];
    const heroImage = pickHeroImage(vicfloraImages, alaTaxon);
    const gallery = orderGalleryWithHeroFirst(buildImageGallery(vicfloraImages), heroImage);
    const family = classificationFamily(vicfloraProfile?.classification ?? [], alaTaxon);
    const genus = classificationGenus(scientificName, vicfloraProfile?.classification ?? [], alaTaxon);
    const conservation = attr(alaFloraProfile, "Conservation Status") ?? alaTaxon?.conservationStatus ?? undefined;
    const displayName = vicfloraProfile?.taxon.preferredCommonName ??
      alaTaxon?.commonNameSingle ??
      commonNames[0] ??
      scientificName;

    return {
      query: {
        name: input.name,
        region
      },
      displayName,
      scientificName,
      scientificNameWithAuthorship,
      family,
      groupLabel: groupLabelFromGenus(genus),
      spotIt: {
        oneLiner,
        fieldMarks: parseFieldMarks(diagnosticFeatures, description, oneLiner),
        heroImage
      },
      inVictoria: {
        statusLabel: humanizeStatus(
          vicfloraProfile?.taxon.occurrenceStatus,
          vicfloraProfile?.taxon.establishmentMeans,
          vicfloraProfile?.taxon.endemic
        ),
        where: mergeWhereText(vicSections.habitat, vicSections.distributionAustralia, attr(alaFloraProfile, "Habitat")),
        when: formatPhenology(vicfloraProfile?.phenology ?? [], vicSections.phenology),
        conservation: conservation ?? undefined
      },
      detail: {
        fullDescription: description,
        nationalRange: attr(alaFloraProfile, "Distribution") ?? vicSections.distributionAustralia,
        nationalHabitat: attr(alaFloraProfile, "Habitat"),
        confusionNotes: pickConfusionNotes(attr(alaFloraProfile, "Taxonomic Notes"), vicSections.note)
      },
      media: {
        gallery,
        groups: groupGalleryImages(gallery)
      },
      naming: {
        commonNames,
        alsoKnownAs: curateAlsoKnownAs(commonNames, displayName, scientificName),
        synonyms: unique((vicfloraProfile?.synonyms ?? []).map((synonym) => synonym.fullNameWithAuthorship ?? synonym.fullName))
      },
      references: this.references(vicfloraProfile, alaTaxon, alaFloraProfile),
      sources: this.sourceComparison(vicfloraProfile, alaTaxon, alaFloraProfile),
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
  ): PlantLearningProfile["sources"] {
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

  private references(
    vicfloraProfile: PlantProfile | undefined,
    alaTaxon: AlaTaxon | undefined,
    alaFloraProfile: AlaFloraProfile | undefined
  ): PlantLearningProfile["references"] {
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
