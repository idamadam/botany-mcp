import {
  buildAllowAttribute,
  type McpUiSandboxProxyReadyNotification,
  type McpUiSandboxResourceReadyNotification
} from "@modelcontextprotocol/ext-apps/app-bridge";

const allowedReferrer = /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/;
if (window.self === window.top) throw new Error("Sandbox proxy must run inside an iframe.");
if (!document.referrer || !allowedReferrer.test(document.referrer)) {
  throw new Error(`Harness embedding origin is not allowed: ${document.referrer || "missing"}`);
}

const hostOrigin = new URL(document.referrer).origin;
const ownOrigin = window.location.origin;

try {
  void window.top?.document;
  throw new Error("Sandbox isolation self-test failed.");
} catch (error) {
  if (error instanceof Error && error.message === "Sandbox isolation self-test failed.") throw error;
}

const inner = document.createElement("iframe");
inner.title = "MCP App view";
inner.style.cssText = "width:100%;min-height:100%;border:0;display:block";
inner.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
document.body.append(inner);

let innerResizeObserver: ResizeObserver | undefined;

const applyInnerHeight = (height: number) => {
  if (height > 0) inner.style.height = `${height}px`;
};

const measureInnerHeight = () => {
  const doc = inner.contentDocument;
  if (!doc) return 0;

  const root = doc.documentElement;
  const previous = root.style.height;
  root.style.height = "max-content";
  const measured = Math.ceil(root.getBoundingClientRect().height);
  root.style.height = previous;
  return measured;
};

const syncInnerHeight = () => {
  const measured = measureInnerHeight();
  if (measured > 0) applyInnerHeight(measured);
};

const watchInnerHeight = () => {
  innerResizeObserver?.disconnect();
  const doc = inner.contentDocument;
  if (!doc) return;

  innerResizeObserver = new ResizeObserver(() => syncInnerHeight());
  innerResizeObserver.observe(doc.documentElement);
  innerResizeObserver.observe(doc.body);
  syncInnerHeight();
};

const resourceReady: McpUiSandboxResourceReadyNotification["method"] =
  "ui/notifications/sandbox-resource-ready";
const proxyReady: McpUiSandboxProxyReadyNotification["method"] =
  "ui/notifications/sandbox-proxy-ready";

window.addEventListener("message", (event) => {
  if (event.source === window.parent) {
    if (event.origin !== hostOrigin) return;
    if (event.data?.method === resourceReady) {
      const { html, sandbox, permissions } = event.data.params;
      if (typeof sandbox === "string") inner.setAttribute("sandbox", sandbox);
      const allow = buildAllowAttribute(permissions);
      if (allow) inner.setAttribute("allow", allow);
      const doc = inner.contentDocument ?? inner.contentWindow?.document;
      if (!doc || typeof html !== "string") return;
      doc.open();
      doc.write(html);
      doc.close();
      inner.style.removeProperty("height");
      queueMicrotask(() => watchInnerHeight());
      return;
    }
    inner.contentWindow?.postMessage(event.data, "*");
    return;
  }

  if (event.source === inner.contentWindow && event.origin === ownOrigin) {
    window.parent.postMessage(event.data, hostOrigin);
  }
});

window.parent.postMessage(
  { jsonrpc: "2.0", method: proxyReady, params: {} },
  hostOrigin
);
