import { describe, it, expect } from "vitest";
import { apexCore } from "@/lib/apex/core";
import { derivBus } from "@/lib/deriv/tick-bus";
import { rankOpportunities, DEFAULT_SCAN_OPTIONS, whyNotRunnerUp } from "@/lib/apex/scan";
import {
  reduceAlerts,
  DEFAULT_ALERT_CONFIG,
  EMPTY_ALERT_STATE,
} from "@/lib/sentinel/opportunity-alert";
import { digitPsychologyEngine } from "@/lib/sentinel/digit-psychology";
import { psychologyEngine } from "@/lib/apex/psychology";

describe("Apex & Sentinel Initialization & Rendering smoke test", () => {
  it("initializes apex core without throwing", () => {
    apexCore.retain();
    const intels = apexCore.getAll();
    expect(Array.isArray(intels)).toBe(true);
  });

  it("ranks opportunities even when intels are empty or thin", () => {
    const intels = apexCore.getAll();
    const ranked = rankOpportunities(intels, DEFAULT_SCAN_OPTIONS);
    expect(ranked).toBeDefined();
    expect(Array.isArray(ranked.ranked)).toBe(true);
  });

  it("reduces alerts without throwing", () => {
    const intels = apexCore.getAll();
    const ranked = rankOpportunities(intels, DEFAULT_SCAN_OPTIONS).ranked;
    const res = reduceAlerts(EMPTY_ALERT_STATE, ranked, DEFAULT_ALERT_CONFIG, Date.now());
    expect(res).toBeDefined();
  });

  it("handles deep ticks and complex market intelligence without throwing", () => {
    // Feed 1000 ticks into derivBus for R_100
    const ticks = [];
    let price = 1000.5;
    const nowMs = Date.now();
    for (let i = 0; i < 1000; i++) {
      price += (Math.random() - 0.49) * 0.5;
      ticks.push({
        t: nowMs - 1000000 + i * 1000,
        price,
      });
    }

    apexCore.retain();
    // Simulate derivBus delivering ticks for R_100
    // @ts-expect-error test mock injection
    derivBus.setBuffer("R_100", ticks);

    // Call analyse on R_100
    // @ts-expect-error test mock method
    apexCore.analyse("R_100");

    const intels = apexCore.getAll();
    expect(intels.length).toBeGreaterThan(0);
    const intelR100 = intels.find((i) => i.symbol === "R_100");
    expect(intelR100).toBeDefined();

    const ranked = rankOpportunities(intels, { ...DEFAULT_SCAN_OPTIONS, minTicks: 10 });
    console.log(
      "intelR100 dataState:",
      intelR100?.dataState,
      "ticks:",
      intelR100?.ticks,
      "rejected:",
      ranked.rejected,
    );
    expect(ranked.ranked.length).toBeGreaterThan(0);
    const best = ranked.ranked[0];
    expect(best).toBeDefined();

    if (ranked.ranked.length > 1) {
      const whyLines = whyNotRunnerUp(best, ranked.ranked[1]);
      expect(Array.isArray(whyLines)).toBe(true);
    }
  });
});
