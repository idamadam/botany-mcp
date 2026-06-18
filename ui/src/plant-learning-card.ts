import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
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
  onhostcontextchanged?: (context: { theme?: "light" | "dark" }) => void;
  getHostContext?: () => { theme?: "light" | "dark" } | undefined;
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

const syncHostTheme = (theme?: "light" | "dark") => {
  if (theme) {
    applyDocumentTheme(theme);
  }
};

if (app instanceof App) {
  app.onhostcontextchanged = (context) => {
    syncHostTheme(context.theme);
  };
} else if (isPreviewMode()) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const applyPreferredTheme = () => {
    applyDocumentTheme(media.matches ? "dark" : "light");
  };
  applyPreferredTheme();
  media.addEventListener("change", applyPreferredTheme);
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (id: string, value: string | undefined, fallback = "No data available yet.") => {
  byId(id).textContent = value?.trim() || fallback;
};

let galleryImages: PlantImage[] = [];
let gallerySelectedIndex = 0;
let galleryInteractionsReady = false;

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
  text("scientific-name", profile.scientificName, "");

  const fullName = profile.scientificNameWithAuthorship?.trim();
  const authorship = fullName?.startsWith(profile.scientificName)
    ? fullName.slice(profile.scientificName.length).trim()
    : "";
  text("scientific-authorship", authorship, "");
};

const setCardReady = (ready: boolean) => {
  byId("card-placeholder").hidden = ready;
  byId("card-body").hidden = !ready;
  const shell = byId("app-shell");
  shell.setAttribute("aria-busy", String(!ready));
  shell.dataset.ready = String(ready);
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

const scrollThumbIntoView = (button: HTMLButtonElement) => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  button.scrollIntoView({
    block: "nearest",
    inline: "center",
    behavior: prefersReducedMotion ? "auto" : "smooth"
  });
};

const updateGalleryNav = (index: number, total: number) => {
  const prev = byId<HTMLButtonElement>("gallery-prev");
  const counter = byId("gallery-counter");
  const showNav = total > 1;

  prev.hidden = !showNav;
  byId<HTMLButtonElement>("gallery-next").hidden = !showNav;
  counter.hidden = !showNav;

  if (showNav) {
    prev.disabled = index <= 0;
    byId<HTMLButtonElement>("gallery-next").disabled = index >= total - 1;
    counter.textContent = `${index + 1} / ${total}`;
  } else {
    counter.textContent = "";
  }
};

const selectGalleryIndex = (index: number) => {
  if (galleryImages.length === 0) {
    return;
  }

  const nextIndex = Math.max(0, Math.min(index, galleryImages.length - 1));
  gallerySelectedIndex = nextIndex;
  renderGalleryImage(galleryImages[nextIndex], galleryImages, nextIndex);
};

const renderGalleryImage = (image: PlantImage, images: PlantImage[], index: number) => {
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

  updateGalleryNav(index, images.length);
  byId("gallery-announce").textContent = `Photo ${index + 1} of ${images.length}: ${galleryTitle(image)}`;

  const filmstrip = byId("gallery-thumbnails");
  filmstrip.querySelectorAll<HTMLButtonElement>(".gallery-thumb").forEach((button, thumbIndex) => {
    const selected = thumbIndex === index;
    button.setAttribute("aria-selected", String(selected));
    button.setAttribute("tabindex", selected ? "0" : "-1");
    if (selected) {
      scrollThumbIntoView(button);
    }
  });
};

const setupGalleryInteractions = () => {
  if (galleryInteractionsReady) {
    return;
  }
  galleryInteractionsReady = true;

  byId<HTMLButtonElement>("gallery-prev").addEventListener("click", () => {
    selectGalleryIndex(gallerySelectedIndex - 1);
  });
  byId<HTMLButtonElement>("gallery-next").addEventListener("click", () => {
    selectGalleryIndex(gallerySelectedIndex + 1);
  });

  const viewer = byId("gallery-viewer");
  viewer.addEventListener("keydown", (event) => {
    if (viewer.hidden || galleryImages.length === 0) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectGalleryIndex(gallerySelectedIndex - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectGalleryIndex(gallerySelectedIndex + 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      selectGalleryIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      selectGalleryIndex(galleryImages.length - 1);
    }
  });

  byId("gallery-thumbnails").addEventListener("keydown", (event) => {
    if (byId("gallery-viewer").hidden || galleryImages.length === 0) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.classList.contains("gallery-thumb")) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectGalleryIndex(gallerySelectedIndex - 1);
      filmstripFocusSelected();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectGalleryIndex(gallerySelectedIndex + 1);
      filmstripFocusSelected();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      selectGalleryIndex(0);
      filmstripFocusSelected();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      selectGalleryIndex(galleryImages.length - 1);
      filmstripFocusSelected();
    }
  });
};

const filmstripFocusSelected = () => {
  const selected = byId("gallery-thumbnails").querySelector<HTMLButtonElement>(
    ".gallery-thumb[aria-selected='true']"
  );
  selected?.focus();
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

const renderGallery = (profile: PlantLearningProfile) => {
  setupGalleryInteractions();

  const filmstrip = byId("gallery-thumbnails");
  filmstrip.replaceChildren();

  const images = profile.imageGallery?.length
    ? profile.imageGallery
    : profile.heroImage?.url
      ? [profile.heroImage]
      : [];

  galleryImages = images;
  gallerySelectedIndex = 0;
  const viewer = byId("gallery-viewer");

  if (images.length === 0) {
    viewer.hidden = true;
    byId("gallery-frame").replaceChildren();
    text("gallery-title", "Photos");
    text("gallery-caption", undefined, "No photos returned yet.");
    text("gallery-credit", undefined, "");
    byId("gallery-counter").hidden = true;
    byId<HTMLAnchorElement>("gallery-source").hidden = true;
    byId<HTMLButtonElement>("gallery-prev").hidden = true;
    byId<HTMLButtonElement>("gallery-next").hidden = true;
    byId("gallery-announce").textContent = "";
    return;
  }

  viewer.hidden = false;

  for (const [index, image] of images.entries()) {
    const button = document.createElement("button");
    button.className = "gallery-thumb";
    button.type = "button";
    button.role = "tab";
    button.setAttribute("aria-selected", String(index === 0));
    button.setAttribute("tabindex", index === 0 ? "0" : "-1");
    button.setAttribute("aria-label", galleryThumbLabel(image, index));

    const thumbnail = document.createElement("img");
    thumbnail.src = image.url;
    thumbnail.alt = "";

    button.append(thumbnail);
    button.addEventListener("click", () => selectGalleryIndex(index));
    filmstrip.append(button);
  }

  renderGalleryImage(images[0], images, 0);
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
  setCardReady(true);
};

app.ontoolresult = (result) => {
  const profile = parseProfile(result as ToolResult);
  if (profile) {
    renderProfile(profile);
  }
};

void Promise.resolve(app.connect()).then(() => {
  if (app instanceof App) {
    syncHostTheme(app.getHostContext()?.theme);
  }
});
