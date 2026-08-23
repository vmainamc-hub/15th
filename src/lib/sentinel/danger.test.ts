import { describe, expect, it } from "vitest";
import { composeDanger, type DangerInputs } from "./danger";

const baseContract = {
  label: "UNDER 7",
  side: "UNDER" as const,
  barrier: 7,
  winners: [0, 1, 2, 3, 4, 5, 6],
};

describe("composeDanger", () => {
  it("reports CALM with zero components on clean input", () => {
    const input: DangerInputs = {
      intel: null,
      contract: baseContract,
      lifetimeTicks: 500,
      recentLatencyMs: 120,
    };
    const comp = composeDanger(input);
    expect(comp.level).toBe("CALM");
    expect(comp.total).toBe(0);
    expect(comp.autoBlock.length).toBe(0);
  });

  it("triggers AUTO_BLOCK when feed latency breaches safety limits", () => {
    const input: DangerInputs = {
      intel: null,
      contract: baseContract,
      lifetimeTicks: 500,
      recentLatencyMs: 1400,
    };
    const comp = composeDanger(input);
    expect(comp.autoBlock.length).toBeGreaterThan(0);
    expect(comp.autoBlock[0].code).toBe("LATENCY_BREACH");
    expect(comp.level).toBe("CRITICAL");
  });

  it("triggers AUTO_BLOCK when sample size is critically small", () => {
    const input: DangerInputs = {
      intel: null,
      contract: baseContract,
      lifetimeTicks: 35,
    };
    const comp = composeDanger(input);
    expect(comp.autoBlock.some((c) => c.code === "INSUFFICIENT_SAMPLE")).toBe(true);
  });

  it("accumulates multiple mild/moderate risks into an elevated score without auto-blocking", () => {
    const input: DangerInputs = {
      intel: null,
      contract: baseContract,
      lifetimeTicks: 100, // young (HIGH, 18 pts)
      losingSideHostile: true, // MODERATE, 12 pts
      consecutiveLosses: 2, // 14 pts
    };
    const comp = composeDanger(input);
    expect(comp.total).toBe(44);
    expect(comp.level).toBe("ELEVATED");
    expect(comp.autoBlock.length).toBe(0);
  });
});
