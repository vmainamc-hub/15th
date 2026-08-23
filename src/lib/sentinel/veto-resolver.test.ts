import { describe, it, expect } from "vitest";
import { resolveVeto } from "./veto-resolver";

describe("Unified Veto Hierarchy (§5)", () => {
  it("returns CLEAR when no veto conditions exist", () => {
    const res = resolveVeto(
      "R_100:OVER2",
      {},
      { isVetoed: false, state: "RIPE" },
      { vetoed: false },
    );
    expect(res.verdict).toBe("CLEAR");
    expect(res.isBlocked).toBe(false);
    expect(res.source).toBe("NONE");
  });

  it("prioritizes Local Engine Veto over Observation and Global Governance", () => {
    const res = resolveVeto(
      "R_100:OVER2",
      { digitPsychologyHardBlock: true, digitPsychologyReason: "Digit 9 hostile cluster" },
      { isVetoed: true, state: "VETOED" },
      { vetoed: true, rule: "Account loss streak" },
    );
    expect(res.verdict).toBe("BLOCKED");
    expect(res.isBlocked).toBe(true);
    expect(res.source).toBe("LOCAL_ENGINE");
    expect(res.reason).toContain("DIGIT PSYCHOLOGY BLOCK");
  });

  it("evaluates Price Action Veto as local engine block", () => {
    const res = resolveVeto(
      "1HZ10V:UNDER7",
      { priceActionVeto: true, priceActionReason: "5-tick counter surge" },
      null,
      null,
    );
    expect(res.verdict).toBe("BLOCKED");
    expect(res.isBlocked).toBe(true);
    expect(res.source).toBe("LOCAL_ENGINE");
    expect(res.reason).toContain("PRICE ACTION VETO");
  });

  it("evaluates Danger Hard Block as local engine block", () => {
    const res = resolveVeto(
      "R_50:OVER1",
      { dangerHardBlocked: true, dangerReason: "Extreme entropy divergence" },
      null,
      null,
    );
    expect(res.verdict).toBe("BLOCKED");
    expect(res.isBlocked).toBe(true);
    expect(res.source).toBe("LOCAL_ENGINE");
    expect(res.reason).toContain("DANGER HARD BLOCK");
  });

  it("evaluates Observation Veto when local engine is clear", () => {
    const res = resolveVeto(
      "R_25:OVER3",
      { digitPsychologyHardBlock: false },
      { isVetoed: true, state: "VETOED", reason: "Contradiction limit exceeded" },
      { vetoed: false },
    );
    expect(res.verdict).toBe("BLOCKED");
    expect(res.isBlocked).toBe(true);
    expect(res.source).toBe("OBSERVATION");
    expect(res.reason).toContain("OBSERVATION VETO");
  });

  it("evaluates Global Governance Veto when local engine and observation are clear", () => {
    const res = resolveVeto(
      "R_75:UNDER6",
      null,
      { isVetoed: false, state: "RIPE" },
      { vetoed: true, rule: "EXCESSIVE_VOLATILITY", reason: "Cross-market spike limit" },
    );
    expect(res.verdict).toBe("BLOCKED");
    expect(res.isBlocked).toBe(true);
    expect(res.source).toBe("GLOBAL_GOVERNANCE");
    expect(res.reason).toContain("GLOBAL GOVERNANCE VETO");
  });
});
