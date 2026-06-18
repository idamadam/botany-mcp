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
  displayLabel?: string;
  group?: "habit" | "flowers" | "fruit" | "details";
};

type PlantLearningProfile = {
  query: { name: string; region: "VIC" };
  displayName: string;
  scientificName: string;
  scientificNameWithAuthorship?: string;
  family?: string;
  groupLabel?: string;
  spotIt: {
    oneLiner?: string;
    fieldMarks: string[];
    heroImage?: PlantImage;
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
    gallery: PlantImage[];
    groups?: {
      habit: PlantImage[];
      flowers: PlantImage[];
      fruit: PlantImage[];
      details: PlantImage[];
    };
  };
  naming: {
    commonNames: string[];
    alsoKnownAs: string[];
    synonyms?: string[];
  };
  sources: Array<{
    source: string;
    role: string;
    present: boolean;
    summary: string;
    url?: string;
    iconUrl?: string;
  }>;
  warnings: string[];
};

type ImageGroupKey = NonNullable<PlantImage["group"]>;

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

const GROUP_LABELS: Record<ImageGroupKey, string> = {
  habit: "Whole plant",
  flowers: "Flowers",
  fruit: "Fruit or seeds",
  details: "Close-up detail"
};

const sampleGallery: PlantImage[] = [
  {
    url: "",
    displayLabel: "Whole plant",
    group: "habit",
    caption: "Mature tree beside a watercourse."
  },
  {
    url: "",
    displayLabel: "Flowers",
    group: "flowers",
    caption: "White flowers in branch clusters."
  }
];

const riverRedGumProfile = (): PlantLearningProfile => ({
  query: { name: "Eucalyptus camaldulensis", region: "VIC" },
  displayName: "River Red-gum",
  scientificName: "Eucalyptus camaldulensis",
  scientificNameWithAuthorship: "Eucalyptus camaldulensis Dehnh.",
  family: "Myrtaceae",
  groupLabel: "Eucalypt",
  spotIt: {
    oneLiner: "A smooth-barked tree along streams with cuboid-pyramidal seeds.",
    fieldMarks: [
      "Smooth mottled bark",
      "Long narrow adult leaves",
      "White flowers",
      "Hemispherical fruit with cuboid-pyramidal seeds"
    ],
    heroImage: sampleGallery[0]
  },
  inVictoria: {
    statusLabel: "Native to Victoria",
    where: "Widespread along rivers and floodplains in Victoria.",
    when: "Flowers summer.",
    conservation: undefined
  },
  detail: {
    fullDescription: "Tree commonly to 20 m high, occasionally taller. Bark smooth throughout, white, grey, brown or red.",
    nationalRange: "Occurs in every mainland State.",
    nationalHabitat: "Grows along and near watercourses, whether permanent or intermittent.",
    confusionNotes: "Only the type subspecies occurs in Victoria; national treatments recognise several subspecies across Australia."
  },
  media: {
    gallery: sampleGallery,
    groups: {
      habit: [sampleGallery[0]],
      flowers: [sampleGallery[1]],
      fruit: [],
      details: []
    }
  },
  naming: {
    commonNames: ["River Red-gum", "Red Gum", "River Red Gum", "Murray Red Gum"],
    alsoKnownAs: ["Red Gum", "River Red Gum", "Murray Red Gum"]
  },
  sources: [
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
  warnings: ["Preview mode uses bundled sample data."]
});

const goldenWattleProfile = (): PlantLearningProfile => ({
  query: { name: "Acacia pycnantha", region: "VIC" },
  displayName: "Golden Wattle",
  scientificName: "Acacia pycnantha",
  scientificNameWithAuthorship: "Acacia pycnantha Benth.",
  family: "Fabaceae",
  groupLabel: "Wattle",
  spotIt: {
    oneLiner: "A shrub or small tree with broad sickle-shaped phyllodes and bright yellow flower heads.",
    fieldMarks: [
      "Broad flattened phyllodes",
      "Masses of golden globular flower heads",
      "Spring flowering pulse"
    ],
    heroImage: {
      url: "",
      displayLabel: "Whole plant",
      group: "habit",
      caption: "Golden Wattle in flower."
    }
  },
  inVictoria: {
    statusLabel: "Native to Victoria",
    where: "Common in dry forests and woodlands.",
    when: "Flowers mainly Aug–Oct.",
    conservation: undefined
  },
  detail: {
    fullDescription: "Shrub or small tree with leathery green phyllodes and showy yellow inflorescences.",
    nationalRange: "Native to south-eastern Australia.",
    nationalHabitat: "Dry sclerophyll forest and woodland.",
    confusionNotes: "Compare with other wattles by phyllode shape, flower arrangement, and pod characters."
  },
  media: {
    gallery: [],
    groups: {
      habit: [],
      flowers: [],
      fruit: [],
      details: []
    }
  },
  naming: {
    commonNames: ["Golden Wattle"],
    alsoKnownAs: []
  },
  sources: [
    { source: "VicFlora", role: "Victorian authority", present: true, summary: "Provides local profile and status.", url: "https://vicflora.rbg.vic.gov.au/" },
    { source: "ALA BIE", role: "National taxon identity", present: true, summary: "Provides accepted name and common names.", url: "https://bie.ala.org.au/" },
    { source: "ALA Flora of Australia", role: "National authored treatment", present: false, summary: "No preview profile loaded for this sample." }
  ],
  warnings: ["Preview mode uses bundled sample data."]
});

const sampleProfiles: Record<string, PlantLearningProfile> = {
  "eucalyptus camaldulensis": riverRedGumProfile(),
  "acacia pycnantha": goldenWattleProfile()
};

const fallbackProfile = (name: string): PlantLearningProfile => ({
  ...riverRedGumProfile(),
  query: { name, region: "VIC" },
  displayName: name,
  scientificName: name,
  scientificNameWithAuthorship: undefined,
  naming: { commonNames: [], alsoKnownAs: [] },
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
          structuredContent: { profile: riverRedGumProfile() },
          content: [{ type: "text", text: JSON.stringify({ profile: riverRedGumProfile() }, null, 2) }]
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
const text = (id: string, value: string | undefined, fallback = "") => {
  byId(id).textContent = value?.trim() || fallback;
};

let galleryImages: PlantImage[] = [];
let gallerySelectedIndex = 0;
let galleryInteractionsReady = false;
let activeGalleryGroup: ImageGroupKey | "all" = "all";

const joinParts = (parts: Array<string | undefined>) => parts.filter(Boolean).join(" | ");

const galleryTitle = (image: PlantImage) => image.displayLabel?.trim() || image.caption?.trim() || "Photo";

const imageProxyPath = (profile: PlantLearningProfile) => {
  const urls = [
    profile.spotIt.heroImage?.url,
    ...profile.media.gallery.map((image) => image.url)
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
  entry: PlantLearningProfile["sources"][number],
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

const renderHero = (profile: PlantLearningProfile) => {
  const scientificLine = profile.scientificNameWithAuthorship?.trim() || profile.scientificName;
  text("scientific-name", scientificLine);

  const commonName = profile.displayName.trim();
  const showCommonName = commonName.toLowerCase() !== profile.scientificName.toLowerCase();
  setOptionalText("common-name", showCommonName ? commonName : undefined);

  const aliases = profile.naming.alsoKnownAs;
  setOptionalText(
    "hero-aliases",
    aliases.length > 0 ? `Also known as ${aliases.join(", ")}` : undefined
  );

  const metaParts = [profile.inVictoria.statusLabel];
  if (profile.family) {
    metaParts.push(profile.family);
  }
  setOptionalText("hero-meta", metaParts.filter(Boolean).join(" · "));
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

const imagesForActiveGroup = (profile: PlantLearningProfile) => {
  if (activeGalleryGroup === "all" || !profile.media.groups) {
    return profile.media.gallery.length
      ? profile.media.gallery
      : profile.spotIt.heroImage?.url
        ? [profile.spotIt.heroImage]
        : [];
  }

  const grouped = profile.media.groups[activeGalleryGroup];
  return grouped.length > 0 ? grouped : profile.media.gallery;
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

  if (image.url) {
    const photo = document.createElement("img");
    photo.src = image.url;
    photo.alt = image.caption ?? image.displayLabel ?? "Plant photo";
    frame.append(photo);
  }

  const label = galleryTitle(image);
  const caption = image.caption?.trim();
  const labelElement = byId("gallery-figure-label");
  if (label && label !== caption && label !== "Photo") {
    labelElement.hidden = false;
    labelElement.textContent = label;
  } else {
    labelElement.hidden = true;
    labelElement.textContent = "";
  }

  text("gallery-caption", caption);
  text(
    "gallery-credit",
    joinParts([
      image.creator && `Photo: ${image.creator}`,
      image.license
    ]),
    image.url ? "Photo credit unavailable." : ""
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
};

const renderGalleryGroupTabs = (profile: PlantLearningProfile) => {
  const tabs = byId("gallery-group-tabs");
  tabs.replaceChildren();

  const groups = profile.media.groups;
  if (!groups) {
    tabs.hidden = true;
    tabs.removeAttribute("role");
    return;
  }

  const available = (Object.keys(GROUP_LABELS) as ImageGroupKey[]).filter((key) => groups[key].length > 0);
  if (available.length <= 1) {
    tabs.hidden = true;
    tabs.removeAttribute("role");
    return;
  }

  tabs.hidden = false;
  tabs.setAttribute("role", "tablist");

  const addTab = (key: ImageGroupKey | "all", label: string, count?: number) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-group-tab";
    button.role = "tab";
    button.setAttribute("aria-selected", String(activeGalleryGroup === key));
    button.textContent = count === undefined ? label : `${label} (${count})`;
    button.addEventListener("click", () => {
      activeGalleryGroup = key;
      renderGallery(profile);
    });
    tabs.append(button);
  };

  addTab("all", "All photos", profile.media.gallery.length);
  for (const key of available) {
    addTab(key, GROUP_LABELS[key], groups[key].length);
  }
};

const renderGallery = (profile: PlantLearningProfile) => {
  setupGalleryInteractions();
  renderGalleryGroupTabs(profile);

  const filmstrip = byId("gallery-thumbnails");
  filmstrip.replaceChildren();

  const images = imagesForActiveGroup(profile).filter((image) => image.url);
  galleryImages = images;
  gallerySelectedIndex = 0;
  const viewer = byId("gallery-viewer");

  if (images.length === 0) {
    viewer.hidden = true;
    byId("gallery-frame").replaceChildren();
    byId("gallery-figure-label").hidden = true;
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

  const showFilmstrip = images.length > 3;
  filmstrip.hidden = !showFilmstrip;
  if (showFilmstrip) {
    filmstrip.setAttribute("role", "tablist");
  } else {
    filmstrip.removeAttribute("role");
  }

  if (showFilmstrip) {
    for (const [index, image] of images.entries()) {
      const button = document.createElement("button");
      button.className = "gallery-thumb";
      button.type = "button";
      button.role = "tab";
      button.setAttribute("aria-selected", String(index === 0));
      button.setAttribute("tabindex", index === 0 ? "0" : "-1");
      button.setAttribute("aria-label", galleryTitle(image));

      const thumbnail = document.createElement("img");
      thumbnail.src = image.url;
      thumbnail.alt = "";

      button.append(thumbnail);
      button.addEventListener("click", () => selectGalleryIndex(index));
      filmstrip.append(button);
    }
  }

  renderGalleryImage(images[0], images, 0);
};

const renderFieldMarks = (marks: string[]) => {
  const list = byId<HTMLUListElement>("field-marks");
  list.replaceChildren();

  if (marks.length === 0) {
    list.hidden = true;
    return;
  }

  list.hidden = false;
  for (const mark of marks) {
    const item = document.createElement("li");
    item.textContent = mark;
    list.append(item);
  }
};

const renderWarnings = (warnings: string[]) => {
  const banner = byId("warnings-banner");
  const list = byId<HTMLUListElement>("warnings-list");
  list.replaceChildren();

  if (warnings.length === 0) {
    banner.hidden = true;
    return;
  }

  banner.hidden = false;
  for (const warning of warnings) {
    const item = document.createElement("li");
    item.textContent = warning;
    list.append(item);
  }
};

const renderSourceComparison = (profile: PlantLearningProfile) => {
  const list = byId<HTMLUListElement>("source-comparison");
  list.replaceChildren();

  const cited = profile.sources.filter((entry) => entry.present);
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
    item.className = "empty-note";
    item.textContent = "No sources cited.";
    list.append(item);
  }
};

const setOptionalText = (id: string, value?: string) => {
  const element = byId(id);
  const trimmed = value?.trim();
  if (!trimmed) {
    element.hidden = true;
    element.textContent = "";
    return;
  }
  element.hidden = false;
  element.textContent = trimmed;
};

const setOptionalBlock = (blockId: string, value: string | undefined) => {
  const block = byId(blockId);
  const hasValue = Boolean(value?.trim());
  block.hidden = !hasValue;
  return hasValue ? value!.trim() : "";
};

const renderProfile = (profile: PlantLearningProfile) => {
  activeGalleryGroup = "all";

  renderHero(profile);

  renderWarnings(profile.warnings);

  setOptionalText("spot-one-liner", profile.spotIt.oneLiner);
  renderFieldMarks(profile.spotIt.fieldMarks);
  byId("spot-it-section").hidden =
    byId("spot-one-liner").hidden && byId("field-marks").hidden;

  renderGallery(profile);

  setOptionalText("in-victoria-where", profile.inVictoria.where);
  setOptionalText("in-victoria-when", profile.inVictoria.when);
  setOptionalText("in-victoria-conservation", profile.inVictoria.conservation);
  byId("in-victoria-section").hidden = ["in-victoria-where", "in-victoria-when", "in-victoria-conservation"]
    .every((id) => byId(id).hidden);

  const nationalRange = setOptionalBlock("national-range-block", profile.detail.nationalRange);
  text("national-range", nationalRange);
  const nationalHabitat = setOptionalBlock("national-habitat-block", profile.detail.nationalHabitat);
  text("national-habitat", nationalHabitat);
  const confusion = setOptionalBlock("confusion-block", profile.detail.confusionNotes);
  text("confusion-notes", confusion);
  setOptionalBlock("description-block", profile.detail.fullDescription);
  text("full-description", profile.detail.fullDescription);

  const detailSection = byId("detail-section");
  const hasDetailContent = [
    profile.detail.fullDescription,
    profile.detail.nationalRange,
    profile.detail.nationalHabitat,
    profile.detail.confusionNotes
  ].some((value) => Boolean(value?.trim()));
  detailSection.hidden = !hasDetailContent;

  renderSourceComparison(profile);

  byId("sources-section").hidden = profile.sources.every((entry) => !entry.present);
  byId("card-disclosures").hidden = byId("sources-section").hidden;

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
