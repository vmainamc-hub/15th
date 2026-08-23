import { describe, it, expect } from "vitest";
import {
  ContinuousRegimeObserver,
  REGIME_DISPLAY_NAMES,
  TRANSITION_DISPLAY_NAMES,
  ContinuousRegime,
  DigitMomentumReport,
} from "./continuous-regime";
import { CanonicalDigitState, Digit } from "../../types/sentinel";

function createMockCanonical(
  underDominance: boolean = true,
  entropy: number = 0.95,
): CanonicalDigitState {
  const stats: any = {};
  for (let d = 0; d < 10; d++) {
    stats[d] = {
      digit: d as Digit,
      count: underDominance ? (d <= 4 ? 140 : 60) : d >= 5 ? 140 : 60,
      percentage: underDominance ? (d <= 4 ? 14 : 6) : d >= 5 ? 14 : 6,
      deviation: underDominance ? (d <= 4 ? 4 : -4) : d >= 5 ? 4 : -4,
      velocity: 0,
      acceleration: 0,
      pressure: 20,
      recentCount20: 2,
      recentCount50: 5,
      recentCount100: 10,
      consecutiveCount: 1,
      ticksSinceLast: 4,
      isGreen: underDominance ? d === 2 : d === 7,
      isSecondGreen: underDominance ? d === 1 : d === 8,
      isRed: underDominance ? d === 8 : d === 2,
      isSecondRed: false,
      isMostIncreasing: underDominance ? d === 2 : d === 7,
      isMostDecreasing: underDominance ? d === 8 : d === 2,
    };
  }

  return {
    totalTicks: 1000,
    entropy,
    greenDigit: (underDominance ? 2 : 7) as Digit,
    secondGreenDigit: (underDominance ? 1 : 8) as Digit,
    redDigit: (underDominance ? 8 : 2) as Digit,
    secondRedDigit: (underDominance ? 9 : 1) as Digit,
    mostIncreasingDigit: (underDominance ? 2 : 7) as Digit,
    mostDecreasingDigit: (underDominance ? 8 : 2) as Digit,
    digitStats: stats,
    lastUpdated: Date.now(),
    evenPercentage: 50,
    oddPercentage: 50,
  };
}

describe("Continuous Market Regime & Digit Momentum Layer", () => {
  it("1. classifies CALM_STABLE regime under low danger, balanced entropy and low stdDev", () => {
    const observer = new ContinuousRegimeObserver();
    const canonical = createMockCanonical(true, 0.96);

    const report = observer.observe({
      market: "R_100",
      contract: "UNDER_7",
      direction: "UNDER",
      entryDigit: 2,
      canonicalState: canonical,
      recentQuoteTicks: [],
      dangerScore: 15,
      dangerTrend: "STABLE",
      losingSide: {
        contract: "UNDER_7",
        losingDigits: [7, 8, 9] as any,
        winningDigits: [0, 1, 2, 3, 4, 5, 6] as any,
        aggregateLosingScore: 18,
        losingPressureLevel: "CALM",
        specialRiskActive: false,
        specialRiskDigit: null,
        specialRiskNote: "",
        perDigitThreat: {},
        explanation: "",
        isHardBlocked: false,
      } as any,
      historyLength: 30,
    });

    expect(report.currentRegime).toBe("CALM_STABLE");
    expect(report.compatibility.isCompatible).toBe(true);
    expect(report.compatibility.verdict).toBe("COMPATIBLE");
  });

  it("2. detects HIGH_VOLATILITY_UNSTABLE when danger is elevated and quote volatility spikes", () => {
    const observer = new ContinuousRegimeObserver();
    const canonical = createMockCanonical(true, 0.7);

    const ticks = [100, 110, 95, 120, 80];

    const report = observer.observe({
      market: "R_100",
      contract: "UNDER_7",
      direction: "UNDER",
      entryDigit: 2,
      canonicalState: canonical,
      recentQuoteTicks: ticks,
      dangerScore: 65,
      dangerTrend: "INCREASING",
      historyLength: 30,
    });

    expect(report.currentRegime).toBe("HIGH_VOLATILITY_UNSTABLE");
    expect(report.compatibility.isCompatible).toBe(false);
  });

  it("3. calculates 0-4 UNDER vs 5-9 OVER Digit Momentum with side, strength and acceleration", () => {
    const observer = new ContinuousRegimeObserver();
    const canonical = createMockCanonical(true); // UNDER dominance

    const report = observer.observe({
      market: "R_100",
      contract: "UNDER_7",
      direction: "UNDER",
      entryDigit: 2,
      canonicalState: canonical,
      recentQuoteTicks: [],
      dangerScore: 18,
      dangerTrend: "STABLE",
      historyLength: 30,
    });

    expect(report.momentum.momentum_side).toBe("UNDER");
    expect(report.momentum.under_momentum_score).toBeGreaterThan(
      report.momentum.over_momentum_score,
    );
    expect(report.momentum.momentum_strength).toBeGreaterThan(0);
    expect(report.momentum.momentum_confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("4. tracks regime state across observations and calculates maturity", () => {
    const observer = new ContinuousRegimeObserver();
    const canonical = createMockCanonical(true, 0.95);

    // Initial CALM observation
    const initialReport = observer.observe({
      market: "R_100",
      contract: "UNDER_7",
      direction: "UNDER",
      entryDigit: 2,
      canonicalState: canonical,
      recentQuoteTicks: [],
      dangerScore: 15,
      dangerTrend: "STABLE",
      historyLength: 1,
    });
    expect(initialReport.currentRegime).toBe("CALM_STABLE");

    // Continued observation in CALM
    for (let i = 2; i <= 25; i++) {
      observer.observe({
        market: "R_100",
        contract: "UNDER_7",
        direction: "UNDER",
        entryDigit: 2,
        canonicalState: canonical,
        recentQuoteTicks: [],
        dangerScore: 15,
        dangerTrend: "STABLE",
        historyLength: i,
      });
    }

    const matureReport = observer.observe({
      market: "R_100",
      contract: "UNDER_7",
      direction: "UNDER",
      entryDigit: 2,
      canonicalState: canonical,
      recentQuoteTicks: [],
      dangerScore: 15,
      dangerTrend: "STABLE",
      historyLength: 26,
    });

    expect(matureReport.currentRegime).toBe("CALM_STABLE");
    expect(matureReport.regimeAgeTicks).toBeGreaterThanOrEqual(20);
    expect(["DEVELOPING", "ESTABLISHED", "MATURE"]).toContain(matureReport.maturity);
  });

  it("5. evaluates regime-conditioned statistics and compatibility matrix for OVER contracts", () => {
    const observer = new ContinuousRegimeObserver();
    const canonical = createMockCanonical(false); // OVER dominance (5-9)

    const report = observer.observe({
      market: "R_50",
      contract: "OVER_2",
      direction: "OVER",
      entryDigit: 7,
      canonicalState: canonical,
      recentQuoteTicks: [],
      dangerScore: 15,
      dangerTrend: "STABLE",
      losingSide: {
        contract: "OVER_2",
        losingDigits: [0, 1, 2] as any,
        winningDigits: [3, 4, 5, 6, 7, 8, 9] as any,
        aggregateLosingScore: 12,
        losingPressureLevel: "CALM",
        specialRiskActive: false,
        specialRiskDigit: null,
        specialRiskNote: "",
        perDigitThreat: {},
        explanation: "",
        isHardBlocked: false,
      } as any,
      historyLength: 30,
    });

    expect(report.momentum.momentum_side).toBe("OVER");
    expect(report.compatibility.isCompatible).toBe(true);
    expect(report.regimeSpecificStats.comboKey).toContain("R_50::OVER_2::OVER::DIGIT_7");
  });
});
