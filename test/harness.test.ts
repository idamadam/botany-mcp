import { describe, expect, it, vi } from "vitest";
import { addDebugEntry, resolveScenarioResult } from "../harness/src/playback.js";
import { parseScenarios, scenarios } from "../harness/src/scenarios.js";

describe("chat harness scenarios", () => {
  it("validates every authored fixture against the expected app result shape", () => {
    expect(parseScenarios(scenarios)).toHaveLength(4);
  });

  it("rejects malformed fixture results", () => {
    const malformed = structuredClone(scenarios);
    delete (malformed[0].tool.result.structuredContent as Record<string, unknown>).profile;
    expect(() => parseScenarios(malformed)).toThrow();
  });

  it("uses fixtures without invoking the live MCP client", async () => {
    const callLive = vi.fn();
    const result = await resolveScenarioResult(scenarios[0], "fixture", callLive);
    expect(callLive).not.toHaveBeenCalled();
    expect(result).toBe(scenarios[0].tool.result);
  });

  it("routes live playback through the MCP client", async () => {
    const liveResult = { content: [{ type: "text" as const, text: "live" }] };
    const callLive = vi.fn(async () => liveResult);
    await expect(resolveScenarioResult(scenarios[0], "live", callLive)).resolves.toBe(liveResult);
    expect(callLive).toHaveBeenCalledWith(
      "open_plant_learning_card",
      { name: "Eucalyptus camaldulensis", region: "VIC" }
    );
  });

  it("records host, app, and error events without mutating prior state", () => {
    const initial = addDebugEntry([], "host", "mounted", { height: 400 });
    const next = addDebugEntry(initial, "app", "called tool");
    expect(initial).toHaveLength(1);
    expect(next.map((entry) => entry.kind)).toEqual(["host", "app"]);
  });
});
