import {
  AppBridge,
  PostMessageTransport,
  buildAllowAttribute,
  type McpUiResourceCsp,
  type McpUiResourcePermissions,
  type McpUiSandboxProxyReadyNotification
} from "@modelcontextprotocol/ext-apps/app-bridge";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { callLiveTool, readLiveAppResource, type AppResource } from "./mcp.js";
import {
  fixtureResultForTool,
  type HarnessScenario
} from "./scenarios.js";
import type { PlaybackMode } from "./playback.js";

type HostCallbacks = {
  onDebug: (kind: "host" | "app" | "error", message: string, data?: unknown) => void;
  onHeight: (height: number) => void;
};

const hostInfo = { name: "Botany chat harness", version: "0.1.0" };

const loadFixtureResource = async (): Promise<AppResource> => {
  const response = await fetch(`/__app/plant-learning-card.html?t=${Date.now()}`, {
    cache: "no-store"
  });
  if (!response.ok) throw new Error(await response.text());
  return {
    html: await response.text(),
    csp: {
      connectDomains: ["http://localhost:3000", "http://127.0.0.1:3000"],
      resourceDomains: ["http://localhost:3000", "http://127.0.0.1:3000"]
    }
  };
};

const sandboxOrigin = () => {
  const alternateHost = window.location.hostname === "localhost" ? "127.0.0.1" : "localhost";
  return `${window.location.protocol}//${alternateHost}:${window.location.port}`;
};

const waitForSandbox = (
  iframe: HTMLIFrameElement,
  csp?: McpUiResourceCsp,
  permissions?: McpUiResourcePermissions
) => new Promise<void>((resolve, reject) => {
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  const allow = buildAllowAttribute(permissions);
  if (allow) iframe.setAttribute("allow", allow);

  const timeout = window.setTimeout(() => {
    window.removeEventListener("message", listener);
    reject(new Error("Sandbox proxy did not become ready."));
  }, 5000);
  const ready: McpUiSandboxProxyReadyNotification["method"] =
    "ui/notifications/sandbox-proxy-ready";
  const listener = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || event.data?.method !== ready) return;
    window.clearTimeout(timeout);
    window.removeEventListener("message", listener);
    resolve();
  };
  window.addEventListener("message", listener);

  const url = new URL("/sandbox.html", sandboxOrigin());
  if (csp) url.searchParams.set("csp", JSON.stringify(csp));
  iframe.src = url.href;
});

const toolDefinition = (scenario: HarnessScenario): Tool => ({
  name: scenario.tool.name,
  title: "Open plant learning card",
  description: "Open an interactive learning card for a plant.",
  inputSchema: { type: "object", properties: {} },
  _meta: { ui: { resourceUri: scenario.tool.resourceUri } }
});

const minFrameHeight = 240;

export class HarnessAppHost {
  private bridge?: AppBridge;
  private iframe?: HTMLIFrameElement;

  constructor(private readonly callbacks: HostCallbacks) {}

  async mount(
    container: HTMLElement,
    scenario: HarnessScenario,
    mode: PlaybackMode,
    result: CallToolResult,
    theme: "light" | "dark"
  ) {
    await this.dispose();
    const resource = mode === "live"
      ? await readLiveAppResource(scenario.tool.resourceUri)
      : await loadFixtureResource();

    const iframe = document.createElement("iframe");
    iframe.className = "app-frame";
    iframe.title = `${scenario.label} interactive card`;
    container.replaceChildren(iframe);
    this.iframe = iframe;

    await waitForSandbox(iframe, resource.csp, resource.permissions);

    const bridge = new AppBridge(
      null,
      hostInfo,
      {
        openLinks: {},
        serverTools: {},
        logging: {},
        message: { text: {} },
        updateModelContext: { text: {}, structuredContent: {} },
        sandbox: { csp: resource.csp, permissions: resource.permissions }
      },
      {
        hostContext: {
          theme,
          platform: "web",
          displayMode: "inline",
          availableDisplayModes: ["inline"],
          containerDimensions: { width: container.clientWidth, maxHeight: 6000 },
          locale: navigator.language,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          toolInfo: { tool: toolDefinition(scenario) }
        }
      }
    );
    this.bridge = bridge;

    bridge.oncalltool = async ({ name, arguments: args }) => {
      const toolArgs = args ?? {};
      this.callbacks.onDebug("app", `App called ${name}`, toolArgs);
      try {
        const response = mode === "live"
          ? await callLiveTool(name, toolArgs)
          : fixtureResultForTool(scenario, name, toolArgs);
        this.callbacks.onDebug("host", `Returned ${name} result`, response);
        return response;
      } catch (error) {
        this.callbacks.onDebug("error", `App tool call failed: ${name}`, String(error));
        throw error;
      }
    };
    bridge.onopenlink = async ({ url }) => {
      this.callbacks.onDebug("app", "App requested an external link", { url });
      window.open(url, "_blank", "noopener,noreferrer");
      return {};
    };
    bridge.onmessage = async (message) => {
      this.callbacks.onDebug("app", "App sent a message", message);
      return {};
    };
    bridge.onupdatemodelcontext = async (context) => {
      this.callbacks.onDebug("app", "App updated model context", context);
      return {};
    };
    bridge.onloggingmessage = (message) => {
      this.callbacks.onDebug("app", "App log", message);
    };
    bridge.onsizechange = ({ height }) => {
      if (height && height > 0) {
        const nextHeight = Math.max(height, minFrameHeight);
        iframe.style.height = `${nextHeight}px`;
        this.callbacks.onHeight(nextHeight);
      }
    };
    bridge.onrequestdisplaymode = async () => ({ mode: "inline" });

    const initialized = new Promise<void>((resolve) => {
      bridge.oninitialized = () => resolve();
    });
    await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
    await bridge.sendSandboxResourceReady({
      html: resource.html,
      csp: resource.csp,
      permissions: resource.permissions
    });
    await Promise.race([
      initialized,
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("MCP App did not initialize.")), 5000)
      )
    ]);
    await bridge.sendToolInput({ arguments: scenario.tool.arguments });
    await bridge.sendToolResult(result);
    this.callbacks.onDebug("host", "MCP App mounted", {
      resourceUri: scenario.tool.resourceUri,
      mode
    });
  }

  setTheme(theme: "light" | "dark") {
    this.bridge?.sendHostContextChange({ theme });
  }

  async dispose() {
    const bridge = this.bridge;
    this.bridge = undefined;
    if (bridge) {
      try {
        await Promise.race([
          bridge.teardownResource({}),
          new Promise((resolve) => window.setTimeout(resolve, 250))
        ]);
      } catch {
        // A half-mounted view may not be able to acknowledge teardown.
      }
      await bridge.close();
    }
    this.iframe?.remove();
    this.iframe = undefined;
  }
}
