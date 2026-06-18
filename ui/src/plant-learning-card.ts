import { App } from "@modelcontextprotocol/ext-apps";
import "../vendor/oat.min.css";
import "../vendor/oat.min.js";

type PlantImage = {
  url: string;
  sourceUrl?: string;
  caption?: string;
  creator?: string;
  license?: string;
  focus?: string;
};

type PlantLearningProfile = {
  query: { name: string; region: "VIC" };
  displayName: string;
  scientificName: string;
  scientificNameWithAuthorship?: string;
  commonNames: string[];
  heroImage?: PlantImage;
  imageGallery?: PlantImage[];
  recognition: {
    summary?: string;
    diagnosticFeatures?: string;
    description?: string;
  };
  status: {
    victorian?: string;
    establishmentMeans?: string;
    degreeOfEstablishment?: string;
    nationalBiostatus?: string;
    conservation?: string;
  };
  distribution?: {
    victoria?: string;
    national?: string;
  };
  habitat?: {
    victoria?: string;
    national?: string;
  };
  similarityNotes?: string;
  sourceComparison: Array<{
    source: string;
    role: string;
    present: boolean;
    summary: string;
    url?: string;
    iconUrl?: string;
  }>;
  citations: Array<{
    label: string;
    source: string;
    url?: string;
  }>;
  warnings: string[];
};

type ToolResult = {
  structuredContent?: {
    profile?: PlantLearningProfile;
  };
  content?: Array<{ type: string; text?: string }>;
};

type AppBridge = {
  callServerTool(input: { name: string; arguments: Record<string, unknown> }): Promise<ToolResult>;
  connect(): Promise<void> | void;
  ontoolresult?: (result: ToolResult) => void;
};

const sampleProfiles: Record<string, PlantLearningProfile> = {
  "eucalyptus camaldulensis": {
    query: { name: "Eucalyptus camaldulensis", region: "VIC" },
    displayName: "River Red-gum",
    scientificName: "Eucalyptus camaldulensis",
    scientificNameWithAuthorship: "Eucalyptus camaldulensis Dehnh.",
    commonNames: ["River Red-gum", "Red Gum", "River Red Gum", "Murray Red Gum"],
    recognition: {
      summary: "A smooth-barked tree along streams with cuboid-pyramidal seeds.",
      diagnosticFeatures: "Smooth mottled bark, long narrow adult leaves, white flowers, hemispherical fruit, and cuboid-pyramidal yellow-brown seeds.",
      description: "Tree commonly to 20 m high, occasionally taller. Bark smooth throughout, white, grey, brown or red. Adult leaves lanceolate to narrowly lanceolate.",
    },
    status: {
      victorian: "PRESENT",
      establishmentMeans: "NATIVE",
      degreeOfEstablishment: "NATIVE",
      nationalBiostatus: "Native."
    },
    distribution: {
      victoria: "Widespread along rivers in Victoria.",
      national: "Occurs in every mainland State."
    },
    habitat: {
      victoria: "Widespread along rivers in Victoria.",
      national: "Grows along and near watercourses, whether permanent or intermittent."
    },
    similarityNotes: "Only the type subspecies occurs in Victoria; national treatments recognise several subspecies across Australia.",
    sourceComparison: [
      {
        source: "VicFlora",
        role: "Victorian authority",
        present: true,
        summary: "Provides Victorian taxon concept, local status, profile text, phenology, images, and references.",
        url: "https://vicflora.rbg.vic.gov.au/flora/taxon/b81ef7c6-89a0-45d7-9b2b-cebb16c7033a"
      },
      {
        source: "ALA BIE",
        role: "National taxon identity",
        present: true,
        summary: "Provides APC-backed accepted taxon metadata, common names, identifiers, image pointers, and occurrence count.",
        url: "https://bie.ala.org.au/species/Eucalyptus+camaldulensis"
      },
      {
        source: "ALA Flora of Australia",
        role: "National authored treatment",
        present: true,
        summary: "Provides structured national flora attributes such as description, diagnostic features, distribution, habitat, and bibliography.",
        url: "https://profiles.ala.org.au/opus/foa/profile/Eucalyptus%20camaldulensis"
      }
    ],
    citations: [
      {
        label: "VicFlora",
        source: "Taxon profile.",
        url: "https://vicflora.rbg.vic.gov.au/flora/taxon/b81ef7c6-89a0-45d7-9b2b-cebb16c7033a"
      },
      {
        label: "Flora of Australia",
        source: "Species profile.",
        url: "https://profiles.ala.org.au/opus/foa/profile/Eucalyptus%20camaldulensis"
      }
    ],
    warnings: ["Preview mode uses bundled sample data."]
  },
  "acacia pycnantha": {
    query: { name: "Acacia pycnantha", region: "VIC" },
    displayName: "Golden Wattle",
    scientificName: "Acacia pycnantha",
    scientificNameWithAuthorship: "Acacia pycnantha Benth.",
    commonNames: ["Golden Wattle"],
    heroImage: {
      url: "",
      caption: "Golden Wattle image area"
    },
    recognition: {
      summary: "A shrub or small tree with broad sickle-shaped phyllodes and bright yellow flower heads.",
      diagnosticFeatures: "Broad flattened phyllodes, masses of golden globular flower heads, and a spring flowering pulse.",
      description: "Shrub or small tree with leathery green phyllodes and showy yellow inflorescences."
    },
    status: {
      victorian: "PRESENT",
      establishmentMeans: "NATIVE",
      degreeOfEstablishment: "NATIVE",
      nationalBiostatus: "Native."
    },
    distribution: {
      victoria: "Common in dry forests and woodlands.",
      national: "Native to south-eastern Australia."
    },
    habitat: {
      victoria: "Often found in open forest, woodland, and disturbed sunny sites.",
      national: "Dry sclerophyll forest and woodland."
    },
    similarityNotes: "Compare with other wattles by phyllode shape, flower arrangement, and pod characters.",
    sourceComparison: [
      { source: "VicFlora", role: "Victorian authority", present: true, summary: "Provides local profile and status.", url: "https://vicflora.rbg.vic.gov.au/" },
      { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Provides accepted name and common names.", url: "https://bie.ala.org.au/" },
      { source: "ALA Flora of Australia", role: "National authored treatment", present: false, summary: "No preview profile loaded for this sample." }
    ],
    citations: [
      { label: "VicFlora", source: "VicFlora taxon profile" }
    ],
    warnings: ["Preview mode uses bundled sample data."]
  }
};

const fallbackProfile = (name: string): PlantLearningProfile => ({
  ...sampleProfiles["eucalyptus camaldulensis"],
  query: { name, region: "VIC" },
  displayName: name,
  scientificName: name,
  scientificNameWithAuthorship: undefined,
  commonNames: [],
  warnings: [`Preview mode has no bundled sample for "${name}".`]
});

const isPreviewMode = () =>
  new URLSearchParams(window.location.search).has("preview") ||
  window.self === window.top &&
    window.location.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

const createBridge = (): AppBridge => {
  if (!isPreviewMode()) {
    return new App({ name: "Plant Learning Card", version: "0.1.0" });
  }

  return {
    async callServerTool(input) {
      const name = String(input.arguments.name ?? "Eucalyptus camaldulensis");
      const profile = sampleProfiles[name.toLowerCase()] ?? fallbackProfile(name);
      return {
        structuredContent: { profile },
        content: [{ type: "text", text: JSON.stringify({ profile }, null, 2) }]
      };
    },
    connect() {
      queueMicrotask(() => {
        this.ontoolresult?.({
          structuredContent: { profile: sampleProfiles["eucalyptus camaldulensis"] },
          content: [{ type: "text", text: JSON.stringify({ profile: sampleProfiles["eucalyptus camaldulensis"] }, null, 2) }]
        });
      });
    }
  };
};

const app = createBridge();

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (id: string, value: string | undefined, fallback = "No data available yet.") => {
  byId(id).textContent = value?.trim() || fallback;
};

const joinParts = (parts: Array<string | undefined>) => parts.filter(Boolean).join(" | ");

const MAX_THUMB_LABEL = 40;

const galleryThumbLabel = (image: PlantImage, index: number) => {
  const candidate = image.focus?.trim() || image.caption?.trim();
  if (!candidate) return `Photo ${index + 1}`;
  if (candidate.length <= MAX_THUMB_LABEL) return candidate;
  return `${candidate.slice(0, MAX_THUMB_LABEL - 1)}…`;
};

const galleryTitle = (image: PlantImage) => image.focus?.trim() || "Photo";

const imageProxyPath = (profile: PlantLearningProfile) => {
  const urls = [
    profile.heroImage?.url,
    ...(profile.imageGallery?.map((image) => image.url) ?? [])
  ].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.pathname.includes("/images/")) {
        return `${parsed.origin}${parsed.pathname}`;
      }
    } catch {
      continue;
    }
  }

  return undefined;
};

const attachSourceIcon = (
  row: HTMLElement,
  entry: PlantLearningProfile["sourceComparison"][number],
  proxyPath?: string
) => {
  const candidates = [
    entry.iconUrl,
    entry.url && proxyPath
      ? `${proxyPath}?url=${encodeURIComponent(new URL("/favicon.ico", new URL(entry.url).origin).href)}`
      : undefined
  ].filter((url, index, list): url is string => Boolean(url) && list.indexOf(url) === index);

  if (candidates.length === 0) return;

  const icon = document.createElement("img");
  icon.className = "source-icon";
  icon.alt = "";
  icon.width = 16;
  icon.height = 16;
  icon.loading = "lazy";
  icon.decoding = "async";

  let attempt = 0;
  const tryNext = () => {
    if (attempt >= candidates.length) {
      icon.remove();
      return;
    }
    icon.src = candidates[attempt++];
  };

  icon.addEventListener("error", tryNext, { once: false });
  row.prepend(icon);
  tryNext();
};

const renderScientificName = (profile: PlantLearningProfile) => {
  text("scientific-name", profile.scientificName);

  const fullName = profile.scientificNameWithAuthorship?.trim();
  const authorship = fullName?.startsWith(profile.scientificName)
    ? fullName.slice(profile.scientificName.length).trim()
    : "";
  text("scientific-authorship", authorship, "");
};

const parseProfile = (result: ToolResult): PlantLearningProfile | undefined => {
  if (result.structuredContent?.profile) {
    return result.structuredContent.profile;
  }

  const textContent = result.content?.find((item) => item.type === "text")?.text;
  if (!textContent) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(textContent) as { profile?: PlantLearningProfile };
    return parsed.profile;
  } catch {
    return undefined;
  }
};

const renderHeroImage = (profile: PlantLearningProfile) => {
  const container = byId("hero-image");
  container.replaceChildren();

  if (!profile.heroImage?.url) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  const image = document.createElement("img");
  image.src = profile.heroImage.url;
  image.alt = profile.heroImage.caption ?? profile.displayName;
  container.append(image);

  const creditText = joinParts([
    profile.heroImage.creator && `Photo: ${profile.heroImage.creator}`,
    profile.heroImage.license
  ]);
  if (creditText) {
    const credit = document.createElement("p");
    credit.className = "image-credit";
    credit.textContent = creditText;
    container.append(credit);
  }
};

const renderSourceComparison = (profile: PlantLearningProfile) => {
  const list = byId<HTMLUListElement>("source-comparison");
  list.replaceChildren();

  const cited = profile.sourceComparison.filter((entry) => entry.present);
  const proxyPath = imageProxyPath(profile);

  for (const entry of cited) {
    const item = document.createElement("li");
    item.className = "source-item";

    const row = document.createElement(entry.url ? "a" : "div");
    row.className = "source-row";
    if (row instanceof HTMLAnchorElement && entry.url) {
      row.href = entry.url;
      row.target = "_blank";
      row.rel = "noreferrer";
    }

    attachSourceIcon(row, entry, proxyPath);

    const name = document.createElement("span");
    name.className = "source-name";
    name.textContent = entry.source;
    row.append(name);
    item.append(row);

    const detail = document.createElement("p");
    detail.className = "source-detail";
    detail.textContent = entry.role;
    item.append(detail);

    list.append(item);
  }

  if (cited.length === 0) {
    const item = document.createElement("li");
    item.className = "source-empty";
    item.textContent = "No sources cited.";
    list.append(item);
  }
};

const renderGalleryImage = (image: PlantImage, images: PlantImage[]) => {
  const frame = byId("gallery-frame");
  frame.replaceChildren();

  const photo = document.createElement("img");
  photo.src = image.url;
  photo.alt = image.caption ?? image.focus ?? "Plant photo";
  frame.append(photo);

  text("gallery-title", galleryTitle(image));
  text("gallery-caption", image.caption);
  text(
    "gallery-credit",
    joinParts([
      image.creator && `Photo: ${image.creator}`,
      image.license
    ]),
    "Photo credit unavailable."
  );

  const source = byId<HTMLAnchorElement>("gallery-source");
  if (image.sourceUrl) {
    source.href = image.sourceUrl;
    source.hidden = false;
  } else {
    source.hidden = true;
  }

  byId("gallery-thumbnails")
    .querySelectorAll<HTMLButtonElement>(".gallery-thumb")
    .forEach((button, index) => {
      button.setAttribute("aria-pressed", String(images[index] === image));
    });
};

const renderGallery = (profile: PlantLearningProfile) => {
  const thumbnails = byId("gallery-thumbnails");
  thumbnails.replaceChildren();

  const images = profile.imageGallery?.length
    ? profile.imageGallery
    : profile.heroImage?.url
      ? [profile.heroImage]
      : [];

  if (images.length === 0) {
    byId("gallery-frame").replaceChildren();
    text("gallery-title", "Photos");
    text("gallery-caption", undefined, "No photos returned yet.");
    text("gallery-credit", undefined, "");
    byId<HTMLAnchorElement>("gallery-source").hidden = true;
    return;
  }

  for (const [index, image] of images.entries()) {
    const button = document.createElement("button");
    button.className = "gallery-thumb";
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === 0));

    const thumbnail = document.createElement("img");
    thumbnail.src = image.url;
    thumbnail.alt = "";

    const label = document.createElement("span");
    label.textContent = galleryThumbLabel(image, index);

    button.append(thumbnail, label);
    button.addEventListener("click", () => renderGalleryImage(image, images));
    thumbnails.append(button);
  }

  renderGalleryImage(images[0], images);
};

const renderProfile = (profile: PlantLearningProfile) => {
  text("display-name", profile.displayName);
  renderScientificName(profile);
  text(
    "status-line",
    joinParts([
      profile.status.victorian && `Victoria: ${profile.status.victorian}`,
      profile.status.establishmentMeans,
      profile.status.nationalBiostatus && `National: ${profile.status.nationalBiostatus}`
    ]),
    "Status not available."
  );

  renderHeroImage(profile);
  renderGallery(profile);
  text("summary", profile.recognition.summary);
  text("habitat", joinParts([
    profile.habitat?.victoria && `Victoria: ${profile.habitat.victoria}`,
    profile.habitat?.national && `National: ${profile.habitat.national}`
  ]));
  text("distribution", joinParts([
    profile.distribution?.victoria && `Victoria: ${profile.distribution.victoria}`,
    profile.distribution?.national && `National: ${profile.distribution.national}`
  ]));
  text("common-names", profile.commonNames.join(", "), "No common names returned.");
  text("diagnostic", profile.recognition.diagnosticFeatures);
  text("description", profile.recognition.description);
  text("similarity", profile.similarityNotes);
  renderSourceComparison(profile);
};

app.ontoolresult = (result) => {
  const profile = parseProfile(result as ToolResult);
  if (profile) {
    renderProfile(profile);
  }
};

app.connect();
