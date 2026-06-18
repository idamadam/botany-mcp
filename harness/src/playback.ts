import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { HarnessScenario } from "./scenarios.js";

export type PlaybackMode = "fixture" | "live";

export type DebugEntry = {
  at: string;
  kind: "host" | "app" | "error";
  message: string;
  data?: unknown;
};

export const addDebugEntry = (
  entries: DebugEntry[],
  kind: DebugEntry["kind"],
  message: string,
  data?: unknown
): DebugEntry[] => [
  ...entries,
  { at: new Date().toISOString(), kind, message, data }
];

export const resolveScenarioResult = async (
  scenario: HarnessScenario,
  mode: PlaybackMode,
  callLive: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>
): Promise<CallToolResult> => {
  if (mode === "fixture") return scenario.tool.result;
  return callLive(scenario.tool.name, scenario.tool.arguments);
};
