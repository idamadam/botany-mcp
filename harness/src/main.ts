import "./styles.css";
import { HarnessAppHost } from "./host.js";
import { callLiveTool } from "./mcp.js";
import {
  addDebugEntry,
  resolveScenarioResult,
  type DebugEntry,
  type PlaybackMode
} from "./playback.js";
import { scenarios, type HarnessScenario } from "./scenarios.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type Theme = "light" | "dark";
type Width = "narrow" | "wide";

let scenario = scenarios[0];
let mode: PlaybackMode = "fixture";
let theme: Theme = "light";
let width: Width = "wide";
let result: CallToolResult | undefined;
let debugEntries: DebugEntry[] = [];

const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `
  <div class="harness-shell" data-theme="light">
    <header class="toolbar">
      <div class="brand">
        <span class="brand-mark">B</span>
        <div><strong>Botany chat harness</strong><small>Model-free MCP App context</small></div>
      </div>
      <div class="toolbar-controls">
        <label>Scenario<select id="scenario"></select></label>
        <label class="switch"><input id="live-mode" type="checkbox"><span>Live MCP</span></label>
        <div class="segmented" aria-label="Theme">
          <button id="light-theme" class="active" type="button">Light</button>
          <button id="dark-theme" type="button">Dark</button>
        </div>
        <div class="segmented" aria-label="Conversation width">
          <button id="narrow-width" type="button">Narrow</button>
          <button id="wide-width" class="active" type="button">Wide</button>
        </div>
        <button id="replay" class="secondary" type="button">Replay</button>
        <button id="remount" class="secondary" type="button">Remount card</button>
      </div>
    </header>
    <main class="workspace">
      <section class="conversation wide" aria-live="polite">
        <div class="conversation-heading"><span class="status-dot"></span><span>Local preview</span></div>
        <div id="transcript"></div>
      </section>
      <details class="developer-panel">
        <summary><span>Developer details</span><span id="debug-count">0 events</span></summary>
        <div class="developer-grid">
          <section><h3>Invocation</h3><pre id="invocation"></pre></section>
          <section><h3>Tool result</h3><pre id="tool-result"></pre></section>
          <section class="event-log"><h3>Host and app messages</h3><pre id="debug-log"></pre></section>
        </div>
      </details>
    </main>
  </div>
`;

const shell = root.querySelector<HTMLElement>(".harness-shell")!;
const conversation = root.querySelector<HTMLElement>(".conversation")!;
const transcript = root.querySelector<HTMLElement>("#transcript")!;
const scenarioSelect = root.querySelector<HTMLSelectElement>("#scenario")!;
const invocation = root.querySelector<HTMLElement>("#invocation")!;
const toolResult = root.querySelector<HTMLElement>("#tool-result")!;
const debugLog = root.querySelector<HTMLElement>("#debug-log")!;
const debugCount = root.querySelector<HTMLElement>("#debug-count")!;

for (const item of scenarios) {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = item.label;
  scenarioSelect.append(option);
}

const renderDebug = () => {
  invocation.textContent = JSON.stringify({
    mode,
    tool: scenario.tool.name,
    arguments: scenario.tool.arguments,
    resourceUri: scenario.tool.resourceUri
  }, null, 2);
  toolResult.textContent = result ? JSON.stringify(result, null, 2) : "Waiting for result…";
  debugLog.textContent = debugEntries.length
    ? debugEntries.map((entry) => JSON.stringify(entry, null, 2)).join("\n\n")
    : "No host or app messages yet.";
  debugCount.textContent = `${debugEntries.length} event${debugEntries.length === 1 ? "" : "s"}`;
};

const debug = (kind: DebugEntry["kind"], message: string, data?: unknown) => {
  debugEntries = addDebugEntry(debugEntries, kind, message, data);
  renderDebug();
};

const appHost = new HarnessAppHost({
  onDebug: debug,
  onHeight: (height) => debug("host", "App resized", { height })
});

const bubble = (role: "user" | "assistant", content: string) => `
  <article class="message ${role}">
    <div class="avatar">${role === "user" ? "You" : "B"}</div>
    <div class="message-body"><span class="role">${role === "user" ? "You" : "Botany"}</span><p>${content}</p></div>
  </article>
`;

const renderTranscript = (item: HarnessScenario, error?: string) => {
  transcript.innerHTML = [
    bubble("user", item.userMessage),
    item.assistantBefore ? bubble("assistant", item.assistantBefore) : "",
    `<div class="card-slot-wrap">
      <div class="tool-caption"><span>${item.tool.name}</span><code>${mode === "live" ? "live" : "fixture"}</code></div>
      <div id="card-slot" class="card-slot">
        ${error ? `<div class="error-state"><strong>Couldn’t render the app</strong><p>${error}</p></div>` : ""}
      </div>
    </div>`,
    item.assistantAfter ? bubble("assistant", item.assistantAfter) : ""
  ].join("");
};

const mountCurrent = async () => {
  if (!result) return;
  const slot = transcript.querySelector<HTMLElement>("#card-slot")!;
  try {
    await appHost.mount(slot, scenario, mode, theme, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debug("error", "App mount failed", message);
    slot.innerHTML = `<div class="error-state"><strong>Couldn’t render the app</strong><p>${message}</p></div>`;
  }
};

const play = async () => {
  debugEntries = [];
  result = undefined;
  renderTranscript(scenario);
  renderDebug();
  debug("host", "Playing scenario", { id: scenario.id, mode });
  const slot = transcript.querySelector<HTMLElement>("#card-slot")!;
  try {
    await appHost.mount(slot, scenario, mode, theme);
    result = await resolveScenarioResult(scenario, mode, callLiveTool);
    debug("host", "Initial tool result ready", result);
    renderDebug();
    await appHost.deliverToolResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debug("error", "Scenario failed", message);
    await appHost.dispose();
    renderTranscript(scenario, message);
  }
};

scenarioSelect.addEventListener("change", () => {
  scenario = scenarios.find((item) => item.id === scenarioSelect.value) ?? scenarios[0];
  void play();
});
root.querySelector<HTMLInputElement>("#live-mode")!.addEventListener("change", (event) => {
  mode = (event.currentTarget as HTMLInputElement).checked ? "live" : "fixture";
  void play();
});
root.querySelector("#replay")!.addEventListener("click", () => void play());
root.querySelector("#remount")!.addEventListener("click", () => void mountCurrent());

const setTheme = (next: Theme) => {
  theme = next;
  shell.dataset.theme = theme;
  root.querySelector("#light-theme")!.classList.toggle("active", theme === "light");
  root.querySelector("#dark-theme")!.classList.toggle("active", theme === "dark");
  appHost.setTheme(theme);
};
root.querySelector("#light-theme")!.addEventListener("click", () => setTheme("light"));
root.querySelector("#dark-theme")!.addEventListener("click", () => setTheme("dark"));

const setWidth = (next: Width) => {
  width = next;
  conversation.classList.toggle("narrow", width === "narrow");
  conversation.classList.toggle("wide", width === "wide");
  root.querySelector("#narrow-width")!.classList.toggle("active", width === "narrow");
  root.querySelector("#wide-width")!.classList.toggle("active", width === "wide");
};
root.querySelector("#narrow-width")!.addEventListener("click", () => setWidth("narrow"));
root.querySelector("#wide-width")!.addEventListener("click", () => setWidth("wide"));

if (import.meta.hot) {
  import.meta.hot.on("mcp-app-updated", () => {
    debug("host", "App bundle rebuilt; remounting current card");
    void mountCurrent();
  });
}

void play();
