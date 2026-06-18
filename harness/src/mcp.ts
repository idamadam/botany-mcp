import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type {
  McpUiResourceCsp,
  McpUiResourcePermissions
} from "@modelcontextprotocol/ext-apps/app-bridge";

export type LiveMcp = {
  client: Client;
  tools: Map<string, Tool>;
};

let connection: Promise<LiveMcp> | undefined;

export const connectLiveMcp = async (): Promise<LiveMcp> => {
  connection ??= (async () => {
    const client = new Client({ name: "Botany chat harness", version: "0.1.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp")));
    const listed = await client.listTools();
    return { client, tools: new Map(listed.tools.map((tool) => [tool.name, tool])) };
  })();

  try {
    return await connection;
  } catch (error) {
    connection = undefined;
    throw error;
  }
};

export const callLiveTool = async (
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> => {
  const { client } = await connectLiveMcp();
  return client.callTool({ name, arguments: args }) as Promise<CallToolResult>;
};

export type AppResource = {
  html: string;
  csp?: McpUiResourceCsp;
  permissions?: McpUiResourcePermissions;
};

export const readLiveAppResource = async (uri: string): Promise<AppResource> => {
  const { client } = await connectLiveMcp();
  const resource = await client.readResource({ uri });
  const content = resource.contents[0];
  if (!content || resource.contents.length !== 1) {
    throw new Error(`Expected one UI resource for ${uri}.`);
  }
  const html = "text" in content ? content.text : atob(content.blob);
  const meta = (content as typeof content & {
    _meta?: { ui?: { csp?: McpUiResourceCsp; permissions?: McpUiResourcePermissions } };
  })._meta?.ui;
  return { html, csp: meta?.csp, permissions: meta?.permissions };
};
