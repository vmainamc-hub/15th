import { describe, it, expect } from "vitest";
import {
  compareRankedOpportunities,
  rankOpportunities,
  DEFAULT_SCAN_OPTIONS,
} from "@/lib/apex/scan";
import type { RankedOpportunity, MarketIntel, ContractEval } from "@/lib/apex/types";

function createMockRankedOpportunity(
  overrides: Partial<RankedOpportunity> = {},
): RankedOpportunity {
  const defaultContract: ContractEval = {
    id: "R_100:OVER_1",
    label: "Over 1",
    side: "OVER",
    digit: 1,
    winners: [2, 3, 4, 5, 6, 7, 8, 9],
    losers: [0, 1],
    theoretical: 0.8,
    payout: 1.25,
    sample: 1000,
    n: 1000,
    empirical: 0.82,
    rawDiff: 0.02,
    zScore: 1.5,
    tStat: 1.5,
    ciLower: 0.8,
    ciUpper: 0.84,
    chiSquare: 2.1,
    pValue: 0.1,
    winRate: 0.82,
    winStreak: 3,
    maxWinStreak: 8,
    lossStreak: 0,
    maxLossStreak: 2,
    compositeEdge: 4.5,
    danger: 20,
    quality: 80,
    stability: 85,
    freshness: 90,
    contradiction: 10,
    confidence: 85,
    opportunity: 75,
    phase: "ACTIVE",
    setupScore: 80,
    veto: false,
    vetoReason: "",
    alerts: [],
    threat: null,
    exposure: null,
    specialRisk: null,
    fakeEdge: null,
    regimeCompatible: true,
    regimeNote: "Compatible",
    threatPenalty: 0,
    losingSidePressure: null,
    winningSideMomentum: {
      index: 70,
      state: "SURGING",
      modifier: 1.05,
      bonusPoints: 4,
      risingCount: 5,
      contributors: [],
      reason: "5 winning digits gaining ground",
    },
  };

  const defaultIntel: MarketIntel = {
    symbol: "R_100",
    name: "Volatility 100 Index",
    dataState: "OK",
    ticks: 1000,
    lastTickAt: Date.now(),
    ageMs: 0,
    stats: null,
    pressure: null,
    transition: null,
    sequence: null,
    entropy: null,
    anomaly: null,
    volatility: null,
    trend: null,
    regime: null,
    personality: null,
    buildup: null,
    quality: null,
    danger: 20,
    contracts: [defaultContract],
    best: defaultContract,
    updatedAt: Date.now(),
    digitIntel: null,
    bars: null,
    criticalReport: null,
    battle: null,
    deepTicks: 1000,
    psychology: null,
    specialDigits: null,
    fluctuation: {
      symbol: "R_100",
      score: 15,
      state: "CALM",
      consecutiveLeadingScans: 10,
      leaderSwitchesInWindow: 0,
      flickerRatePerMinute: 0,
      dominantCandidate: "R_100:OVER_1",
      dominantShare: 0.95,
      windowSize: 20,
      summary: "Calm market with steady leadership",
    },
  };

  return {
    rank: 1,
    symbol: "R_100",
    name: "Volatility 100 Index",
    contract: defaultContract,
    intel: defaultIntel,
    score: 80,
    preferred: true,
    simulator: null,
    simNote: "Mock",
    entry: null,
    agreement: "FULL AGREEMENT",
    evidence: {
      status: "CONFIRMED",
      confidence: 85,
      uncertainty: 15,
      sampleSufficiency: 90,
      note: "Robust statistical confirmation",
    },
    factors: [],
    invalidation: [],
    recent: [],
    recentDiff: 0,
    blocked: false,
    blockReason: null,
    setup: {
      grade: "EXCEPTIONAL",
      score: 85,
      direction: "BULLISH",
      components: {
        patternCompleteness: 90,
        statisticalSignificance: 85,
        regimeAlignment: 90,
        signalPurity: 80,
      },
      summary: "Exceptional setup",
    },
    entryClearance: {
      verdict: "CLEARED",
      requirements: [],
      unmet: [],
      score: 90,
      summary: "All requirements met",
    },
    entryPoint: {
      market: "R_100",
      contract: "OVER_1",
      status: "VALIDATED",
      preferred: { digit: 4, label: "Digit 4", weight: 0.8 },
      fallback: null,
      avoid: [],
      confidence: 85,
      window: { ticks: 10, label: "Active window" },
      rankingDelta: 3,
      summary: "Optimal entry on digit 4",
    },
    digitPsychology: {
      market: "R_100",
      contract: "Over 1",
      side: "OVER",
      verdict: "SUPPORT",
      score: 88,
      gained: 8.5,
      weightTotal: 10,
      hardBlock: false,
      hardBlockReason: null,
      rankingDelta: 3,
      positions: [
        {
          role: "GREEN BAR",
          expected: "5..9",
          actual: 7,
          support: 1,
          weight: 2.5,
          reason: "Green bar is 7",
        },
        {
          role: "RED BAR",
          expected: "5..9",
          actual: 6,
          support: 1,
          weight: 2.5,
          reason: "Red bar is 6",
        },
        {
          role: "EDGE GROUP",
          expected: "7,8,9 < 10% & rising",
          actual: 0.08,
          support: 1,
          weight: 3.5,
          reason: "Edge group rising",
        },
      ],
      contradictions: [],
      cautions: [],
      summary: "Full psychology alignment with edge group rapid rise confirmed",
    },
    priceAction: {
      market: "R_100",
      contract: "Over 1",
      window: 120,
      verdict: "STRONG",
      score: 85,
      pressureDelta: 0.12,
      rankingDelta: 2.5,
      reasons: [],
      cautions: [],
      summary: "Strong bullish pressure",
    },
    operatorSpecial: {
      market: "R_100",
      contract: "Over 1",
      digit: 9,
      action: "NEUTRAL",
      rankingDelta: 0,
      summary: "No special digit penalty",
    },
    relative: {
      symbol: "R_100",
      contract: "OVER_1",
      fieldRank: 1,
      fieldSize: 10,
      relativeEdge: 3.5,
      riskAdjustedEdge: 3.2,
      label: "DOMINANT",
      rankingDelta: 4,
      detail: "Dominant relative edge",
    },
    persistence: {
      scans: 10,
      topThree: 10,
      topRank: 1,
      averageRank: 1,
      persistence: 95,
      edgeStability: 90,
      edgeMean: 4.5,
      edgeStdDev: 0.2,
      rankingDelta: 3,
      summary: "Strong persistence and stability",
    },
    signal: {
      state: "STRONG",
      reason: "Clean setup",
      score: 80,
      timestamp: Date.now(),
      waitForEntry: false,
      entryDigit: 4,
    },
    digitState: {
      window: 1000,
      pct: [0.08, 0.09, 0.11, 0.1, 0.1, 0.11, 0.12, 0.09, 0.1, 0.1],
      entropy: 3.2,
      maxPct: 0.12,
      minPct: 0.08,
      deltaPp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      increasing: [7, 8, 9],
      decreasing: [0, 1],
      change: "CONVERGING",
    },
    ...overrides,
  };
}

describe("Apex Ranking Engine — Psychology, Danger, Momentum, & Manipulation Priorities", () => {
  it("ranks candidates with full psychology support higher than conflicting psychology", () => {
    const oppGoodPsy = createMockRankedOpportunity({
      symbol: "R_100",
      score: 75.0,
      digitPsychology: {
        market: "R_100",
        contract: "Over 1",
        side: "OVER",
        verdict: "SUPPORT",
        score: 90,
        gained: 9.0,
        weightTotal: 10,
        hardBlock: false,
        hardBlockReason: null,
        rankingDelta: 3,
        positions: [
          {
            role: "EDGE GROUP",
            expected: "7,8,9 < 10% & rising",
            actual: 0.08,
            support: 1,
            weight: 3.5,
            reason: "Confirmed",
          },
        ],
        contradictions: [],
        cautions: [],
        summary: "Full psychology alignment",
      },
    });

    const oppWeakPsy = createMockRankedOpportunity({
      symbol: "R_50",
      score: 75.0,
      digitPsychology: {
        market: "R_50",
        contract: "Over 1",
        side: "OVER",
        verdict: "CONTESTED",
        score: 45,
        gained: 3.0,
        weightTotal: 10,
        hardBlock: false,
        hardBlockReason: null,
        rankingDelta: 0,
        positions: [
          {
            role: "EDGE GROUP",
            expected: "7,8,9 < 10% & rising",
            actual: 0.14,
            support: -1,
            weight: 3.5,
            reason: "Edge group exceeded",
          },
        ],
        contradictions: ["Edge group above 10%"],
        cautions: [],
        summary: "Contested psychology",
      },
    });

    const diff = compareRankedOpportunities(oppGoodPsy, oppWeakPsy);
    // Negative diff means oppGoodPsy comes before oppWeakPsy (ascending sort index: 0 is #1)
    expect(diff).toBeLessThan(0);
  });

  it("prioritizes candidates with minimal danger over hazardous candidates when scores are close", () => {
    const oppSafe = createMockRankedOpportunity({
      symbol: "R_100",
      score: 78.0,
      intel: { ...createMockRankedOpportunity().intel, danger: 12 },
      contract: { ...createMockRankedOpportunity().contract, danger: 15 },
    });

    const oppDangerous = createMockRankedOpportunity({
      symbol: "R_75",
      score: 78.0,
      intel: { ...createMockRankedOpportunity().intel, danger: 55 },
      contract: { ...createMockRankedOpportunity().contract, danger: 58 },
    });

    const diff = compareRankedOpportunities(oppSafe, oppDangerous);
    expect(diff).toBeLessThan(0);
  });

  it("prioritizes candidates with winning digits increasing rapidly (high momentum)", () => {
    const oppSurging = createMockRankedOpportunity({
      symbol: "R_100",
      score: 76.0,
      contract: {
        ...createMockRankedOpportunity().contract,
        winningSideMomentum: {
          index: 85,
          state: "SURGING",
          modifier: 1.06,
          bonusPoints: 4.5,
          risingCount: 6,
          contributors: [],
          reason: "Rapid expansion across 6 winning digits",
        },
      },
    });

    const oppFlat = createMockRankedOpportunity({
      symbol: "R_25",
      score: 76.0,
      contract: {
        ...createMockRankedOpportunity().contract,
        winningSideMomentum: {
          index: 10,
          state: "FLAT",
          modifier: 1.0,
          bonusPoints: 0,
          risingCount: 0,
          contributors: [],
          reason: "Flat winning side",
        },
      },
    });

    const diff = compareRankedOpportunities(oppSurging, oppFlat);
    expect(diff).toBeLessThan(0);
  });

  it("prioritizes low fluctuation and clean distribution (low manipulation)", () => {
    const oppCalmClean = createMockRankedOpportunity({
      symbol: "R_100",
      score: 77.0,
      intel: {
        ...createMockRankedOpportunity().intel,
        fluctuation: {
          symbol: "R_100",
          score: 10,
          state: "CALM",
          consecutiveLeadingScans: 15,
          leaderSwitchesInWindow: 0,
          flickerRatePerMinute: 0,
          dominantCandidate: "R_100:OVER_1",
          dominantShare: 0.98,
          windowSize: 20,
          summary: "Very calm market",
        },
      },
      digitState: {
        ...createMockRankedOpportunity().digitState,
        pct: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], // Perfect distribution, TVD = 0
      },
    });

    const oppChaoticManip = createMockRankedOpportunity({
      symbol: "R_50",
      score: 77.0,
      intel: {
        ...createMockRankedOpportunity().intel,
        fluctuation: {
          symbol: "R_50",
          score: 45,
          state: "FLICKERING",
          consecutiveLeadingScans: 2,
          leaderSwitchesInWindow: 4,
          flickerRatePerMinute: 6,
          dominantCandidate: "R_50:OVER_1",
          dominantShare: 0.6,
          windowSize: 20,
          summary: "Flickering market",
        },
      },
      digitState: {
        ...createMockRankedOpportunity().digitState,
        pct: [0.22, 0.02, 0.2, 0.03, 0.18, 0.04, 0.15, 0.03, 0.05, 0.08], // Highly manipulated / clustered
      },
    });

    const diff = compareRankedOpportunities(oppCalmClean, oppChaoticManip);
    expect(diff).toBeLessThan(0);
  });
});
