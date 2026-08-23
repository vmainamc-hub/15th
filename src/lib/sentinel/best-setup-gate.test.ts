/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FINAL SELECTIVITY / BEST-SETUP GATE MANDATORY TEST SUITE
 *
 * Tests the 10 core selectivity scenarios:
 * 1. High score but regime conflict -> REJECT (Failed REGIME gate)
 * 2. High score but momentum conflict -> REJECT (Failed MOMENTUM_DIRECTION gate)
 * 3. High score but insufficient persistence -> REJECT (Failed PERSISTENCE gate)
 * 4. High score but weak regime-specific statistics -> REJECT (Failed REGIME_STATS gate)
 * 5. High score but trigger missing -> REJECT (Failed TRIGGER gate)
 * 6. Strong structure + pressure + momentum + regime + statistics + digit + trigger + persistence -> BEST_SETUP
 * 7. BEST_SETUP + final confirmation -> EXECUTION_QUALIFIED
 * 8. Two simultaneous candidates: only independently valid setups qualify; do not manufacture additional opportunities
 * 9. No setup meets all gates -> ZERO actionable opportunities
 * 10. Existing qualified setup remains governed by its fixed execution window and live-health monitoring
 */

import { describe, expect, it } from "vitest";
import { ObservationLayerEngine } from "./observation-layer";
import { ContractType, OpportunityCandidate } from "../../types/sentinel";
import { isCandidateBestSetup } from "../../hooks/useStrongSignalLock";

function createTestCandidate(
  market: string,
  contract: ContractType,
  score: number = 82,
  dangerScore: number = 20,
  entryDigit: number | null = 3,
  overrides: Record<string, any> = {},
): OpportunityCandidate {
  const isUnder = contract.startsWith("UNDER");
  const barrier = parseInt(contract.split("_")[1], 10);
  const direction = isUnder ? "UNDER" : "OVER";

  const defaultStats: any = {};
  for (let d = 0; d <= 9; d++) {
    defaultStats[d] = {
      digit: d,
      count: 100,
      percentage: 10.0,
      deviation: 0,
      velocity: 0,
      acceleration: 0,
      pressure: 50,
      recentCount20: 2,
      recentCount50: 5,
      recentCount100: 10,
      consecutiveCount: 0,
      ticksSinceLast: 2,
      isGreen: isUnder ? d === 3 : d === 7,
      isSecondGreen: isUnder ? d === 2 : d === 8,
      isRed: isUnder ? d === 8 : d === 2,
      isSecondRed: isUnder ? d === 9 : d === 1,
      isMostIncreasing: isUnder ? d === 3 : d === 7,
      isMostDecreasing: isUnder ? d === 8 : d === 2,
    };
  }

  const base: any = {
    id: `${market}_${contract}`,
    market,
    marketDisplayName: `${market} Volatility Index`,
    contract,
    direction,
    barrier,
    opportunityScore: score,
    confidence: Math.round(score * 0.9),
    absoluteEdge: 5.5,
    relativeEdge: 3.2,
    dangerScore,
    persistenceScore: 85,
    stabilityScore: 80,
    freshnessScore: 85,
    signalState: score >= 75 ? "STRONG" : "VALID",
    engineAgreement: "SUPPORT",
    canonicalState: {
      totalTicks: 1000,
      evenPercentage: 50,
      oddPercentage: 50,
      greenDigit: isUnder ? 3 : 7,
      secondGreenDigit: isUnder ? 2 : 8,
      redDigit: isUnder ? 8 : 2,
      secondRedDigit: isUnder ? 9 : 1,
      mostIncreasingDigit: isUnder ? 3 : 7,
      mostDecreasingDigit: isUnder ? 8 : 2,
      lastUpdated: Date.now(),
      entropy: 0.95,
      digitStats: defaultStats,
    },
    digitPsychology: {
      verdict: "SUPPORT",
      reason: "1000-tick psychology aligns with contract edge.",
      confidence: 85,
      greenDigit: isUnder ? 3 : 7,
      secondGreenDigit: isUnder ? 2 : 8,
      redDigit: isUnder ? 8 : 2,
      secondRedDigit: isUnder ? 9 : 1,
      mostIncreasingDigit: isUnder ? 3 : 7,
      mostDecreasingDigit: isUnder ? 8 : 2,
      hardBlock: false,
    } as any,
    losingSide: {
      contract,
      losingDigits: isUnder ? [7, 8, 9] : ([0, 1, 2] as any),
      winningDigits: isUnder ? [0, 1, 2, 3, 4, 5, 6] : ([3, 4, 5, 6, 7, 8, 9] as any),
      aggregateLosingScore: 18,
      losingPressureLevel: "CALM",
      specialRiskActive: false,
      specialRiskDigit: null,
      specialRiskNote: "None",
      perDigitThreat: {},
      explanation: "Calm",
      isHardBlocked: false,
    },
    selectedEntryDigit: entryDigit as any,
    entryConfidence: 85,
    entryTrigger: {
      preferredTouch: "FIRST_TOUCH",
      triggerState: "ENTER_NOW",
      instruction: "Enter on first touch",
      confidence: 85,
      firstTouchWinRate: 78.0,
      wilsonLowerBound: 68.0,
      firstTouchSample: 20,
    } as any,
    validityWindowSeconds: 90,
    validUntil: Date.now() + 90000,
    pressureField: {
      window15: { netPressure: isUnder ? -2.2 : 2.2 },
      window30: { netPressure: isUnder ? -2.0 : 2.0 },
      window60: { netPressure: isUnder ? -1.8 : 1.8 },
      window120: { netPressure: isUnder ? -1.5 : 1.5 },
      profiles: {
        [entryDigit ?? 3]: { momentum: 0.85, exhaustion: false },
      },
    } as any,
    survivalMetrics: {
      market,
      contract,
      entryDigit: (entryDigit ?? 3) as any,
      totalSequences: 60,
      run1WinRate: 88,
      run2WinRate: 78,
      run3WinRate: 68,
      run4WinRate: 52,
      run5WinRate: 40,
      firstRunLossRate: 12,
      continuationRate: 85,
      recoveryRate: 85,
      averageSurvivalRuns: 2.8,
      deteriorationPoint: 3,
      postEntryExpectancy: 0.55,
      postEntryDrawdown: 0.12,
      survivalLabel: "STRONG",
      isInsufficient: false,
    },
    simulatorStats: {
      totalTrades: 20,
      winRate: 80.0,
      expectancy: 1.4,
    } as any,
    governance: {
      vetoed: false,
      reasons: [],
      marketSafe: true,
      riskMultiplier: 1.0,
      action: "ALLOW",
    } as any,
    whyNumberOne: ["High directional confluence"],
    invalidationConditions: ["Losing side spike"],
    regimeObservation: {
      currentRegime: "CALM_STABLE",
      current_regime: "CALM_STABLE",
      previousRegime: null,
      maturity: "ESTABLISHED",
      confidence: 85,
      stabilityScore: 85,
      transitionProbability: 10,
      transitionState: "NONE",
      transitionType: "STABLE_IN_REGIME",
      isTransitioning: false,
      displayName: "Calm & Stable Market",
      transitionDisplayName: "None",
      compatibility: {
        isCompatible: true,
        verdict: "HIGHLY_FAVORABLE",
        reason: "Regime supports directional persistence",
      },
      momentum: {
        momentumSide: direction,
        momentum_side: direction,
        momentumState: "ACCELERATING",
        momentum_state: "ACCELERATING",
        momentumStrength: 82,
        underMomentumScore: isUnder ? 85 : 15,
        overMomentumScore: isUnder ? 15 : 85,
      },
      regimeSpecificStats: {
        winRate: 78.5,
        sampleSize: 25,
        wilsonLowerBound: 68.0,
        summary: "78.5% win rate under Calm & Stable",
      },
    } as any,
    timestamp: Date.now(),
  };

  return { ...base, ...overrides } as unknown as OpportunityCandidate;
}

describe("Apex Sentinel — Final Selectivity & Best-Setup Gate Mandatory Test Suite", () => {
  // Test 1: High score but regime conflict -> REJECT
  it("1. High score but regime conflict -> REJECT (Cannot become RIPE or BEST_SETUP)", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_100", "UNDER_7", 88, 15, 3, {
      regimeObservation: {
        currentRegime: "DISPLACEMENT_MANIPULATION",
        displayName: "Displacement Manipulation",
        isTransitioning: true,
        transitionProbability: 65,
        transitionState: "DEVELOPING",
        transitionType: "CALM_TO_UNSTABLE",
        compatibility: {
          isCompatible: false,
          verdict: "INCOMPATIBLE",
          reason: "Displacement manipulation opposes standard distributional assumptions",
        },
        momentum: {
          momentumSide: "UNDER",
          momentumState: "ACCELERATING",
          momentumStrength: 80,
        },
        regimeSpecificStats: {
          winRate: 50.0,
          sampleSize: 20,
          summary: "50% win rate under displacement",
        },
      } as any,
    });

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_100", "UNDER_7");
    expect(obs).toBeDefined();
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.currentStage).not.toBe("EXECUTION_WINDOW");
    expect(obs?.qualificationContract?.regimePassed).toBe(false);
    expect(obs?.qualificationContract?.allPassed).toBe(false);
    expect(obs?.qualityBand).not.toBe("BEST_SETUP");
    expect(obs?.qualityBand).not.toBe("EXECUTION_QUALIFIED");
    expect(obs?.qualificationContract?.failedGates).toContain("REGIME");
    expect(obs?.dossier.explanation.whyWaiting).toContain("REJECTED BECAUSE");
  });

  // Test 2: High score but momentum conflict -> REJECT
  it("2. High score but momentum conflict -> REJECT (Momentum direction opposes contract)", () => {
    const engine = new ObservationLayerEngine();
    // UNDER contract with OVER accelerating momentum
    const candidate = createTestCandidate("R_50", "UNDER_7", 86, 18, 3, {
      regimeObservation: {
        currentRegime: "CALM_STABLE",
        displayName: "Calm & Stable Market",
        isTransitioning: false,
        transitionProbability: 10,
        transitionState: "NONE",
        compatibility: {
          isCompatible: true,
          verdict: "HIGHLY_FAVORABLE",
          reason: "Calm market",
        },
        momentum: {
          momentumSide: "OVER", // Opposes UNDER setup
          momentumState: "ACCELERATING",
          momentumStrength: 85,
        },
        regimeSpecificStats: {
          winRate: 75.0,
          sampleSize: 25,
          summary: "75% win rate",
        },
      } as any,
    });

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_50", "UNDER_7");
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.qualificationContract?.momentumDirectionAligned).toBe(false);
    expect(obs?.qualificationContract?.allPassed).toBe(false);
    expect(obs?.qualificationContract?.failedGates).toContain("MOMENTUM_DIRECTION");
    expect(obs?.dossier.explanation.whyWaiting).toContain("REJECTED BECAUSE");
    expect(obs?.dossier.explanation.whyWaiting).toContain("Momentum direction");
  });

  // Test 3: High score but insufficient persistence -> REJECT
  it("3. High score but insufficient persistence -> REJECT (Single scan spike)", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_25", "OVER_2", 92, 14, 6);

    // Single observation tick only
    engine.observeCandidates([candidate], Date.now());

    const obs = engine.getPropositionObservation("R_25", "OVER_2");
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.qualificationContract?.persistencePassed).toBe(false);
    expect(obs?.qualificationContract?.allPassed).toBe(false);
    expect(obs?.qualificationContract?.failedGates).toContain("PERSISTENCE");
  });

  // Test 4: High score but weak regime-specific statistics -> REJECT
  it("4. High score but weak regime-specific statistics -> REJECT (Win rate < 70%)", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_75", "UNDER_7", 84, 18, 3, {
      regimeObservation: {
        currentRegime: "CALM_STABLE",
        displayName: "Calm & Stable Market",
        isTransitioning: false,
        transitionProbability: 10,
        transitionState: "NONE",
        compatibility: {
          isCompatible: true,
          verdict: "HIGHLY_FAVORABLE",
          reason: "Calm",
        },
        momentum: {
          momentumSide: "UNDER",
          momentumState: "ACCELERATING",
          momentumStrength: 80,
        },
        regimeSpecificStats: {
          winRate: 58.0, // Below 70% threshold
          sampleSize: 30,
          summary: "58% win rate under Calm",
        },
      } as any,
      simulatorStats: {
        totalTrades: 20,
        winRate: 58.0,
        expectancy: 0.2,
      } as any,
    });

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_75", "UNDER_7");
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.qualificationContract?.statisticsPassed).toBe(false);
    expect(obs?.qualificationContract?.failedGates).toContain("REGIME_STATS");
  });

  // Test 5: High score but trigger missing -> REJECT
  it("5. High score but trigger missing -> REJECT (Waiting for touch trigger)", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_10", "UNDER_7", 85, 16, 3, {
      entryTrigger: {
        preferredTouch: "FIRST_TOUCH",
        triggerState: "WAIT_FOR_FIRST_TOUCH", // Trigger not confirmed
        instruction: "Awaiting first touch",
        confidence: 60,
        firstTouchWinRate: 75.0,
        wilsonLowerBound: 65.0,
        firstTouchSample: 20,
      } as any,
    });

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_10", "UNDER_7");
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.qualificationContract?.triggerPassed).toBe(false);
    expect(obs?.qualificationContract?.failedGates).toContain("TRIGGER");
  });

  // Test 6: Strong structure + pressure + momentum + regime + statistics + digit + trigger + persistence -> BEST_SETUP
  it("6. Strong multi-layer confluence -> BEST_SETUP (All 16 gates passed)", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_10", "UNDER_7", 84, 18, 3);

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_10", "UNDER_7");
    expect(obs?.qualificationContract?.allPassed).toBe(true);
    expect(obs?.qualificationContract?.failedGates.length).toBe(0);
    expect(obs?.qualificationContract?.qualityBand).toBe("BEST_SETUP");
    expect(obs?.currentStage).toBe("RIPE");
  });

  // Test 7: BEST_SETUP + final confirmation -> EXECUTION_QUALIFIED
  it("7. BEST_SETUP + final confirmation -> EXECUTION_QUALIFIED with immutable snapshot", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_25", "UNDER_7", 84, 18, 3);

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_25", "UNDER_7");
    expect(obs?.currentStage).toBe("RIPE");
    expect(obs?.qualityBand).toBe("EXECUTION_QUALIFIED");
    expect(obs?.snapshot).toBeDefined();
    expect(obs?.snapshot?.qualificationScore).toBe(84);
    expect(obs?.snapshot?.initialValidityDurationSeconds).toBe(90);
    expect(obs?.snapshot?.executionWindowExpiresAt).toBe(obs!.snapshot!.qualifiedAt + 90000);
  });

  // Test 8: Two simultaneous candidates: only independently valid setups qualify
  it("8. Two simultaneous candidates: only independently valid setups qualify without manufacturing extra opportunities", () => {
    const engine = new ObservationLayerEngine();
    const validCandidate = createTestCandidate("R_10", "UNDER_7", 85, 18, 3);
    const unconfirmedCandidate = createTestCandidate("R_50", "OVER_2", 88, 20, 7, {
      entryTrigger: {
        preferredTouch: "FIRST_TOUCH",
        triggerState: "WAIT_FOR_FIRST_TOUCH", // Fails trigger gate
        instruction: "Awaiting touch",
        confidence: 60,
      } as any,
    });

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([validCandidate, unconfirmedCandidate], now + i * 1000);
    }

    const validObs = engine.getPropositionObservation("R_10", "UNDER_7");
    const unconfirmedObs = engine.getPropositionObservation("R_50", "OVER_2");

    expect(validObs?.qualificationContract?.allPassed).toBe(true);
    expect(validObs?.qualityBand).toBe("EXECUTION_QUALIFIED");

    expect(unconfirmedObs?.qualificationContract?.allPassed).toBe(false);
    expect(unconfirmedObs?.qualityBand).not.toBe("EXECUTION_QUALIFIED");
    expect(unconfirmedObs?.qualityBand).not.toBe("BEST_SETUP");
  });

  // Test 9: No setup meets all gates -> ZERO actionable opportunities
  it("9. No setup meets all gates -> ZERO actionable opportunities", () => {
    const engine = new ObservationLayerEngine();
    const cand1 = createTestCandidate("R_10", "UNDER_7", 72, 38, null); // Missing digit
    const cand2 = createTestCandidate("R_25", "OVER_2", 65, 45, 6, {
      regimeObservation: {
        compatibility: { isCompatible: false, verdict: "INCOMPATIBLE" },
      } as any,
    });

    const { ripeCandidates } = engine.observeCandidates([cand1, cand2], Date.now());
    expect(ripeCandidates.length).toBe(0);

    // Verify useStrongSignalLock criteria rejects them
    expect(isCandidateBestSetup(cand1)).toBe(false);
    expect(isCandidateBestSetup(cand2)).toBe(false);
  });

  // Test 10: Existing qualified setup remains governed by its fixed 90s execution window and live-health monitoring
  it("10. Existing qualified setup remains governed by its fixed execution window and live-health monitoring", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_100", "UNDER_7", 84, 18, 3);

    const baseTime = Date.now();
    for (let i = 0; i < 6; i++) {
      engine.observeCandidates([candidate], baseTime + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_100", "UNDER_7");
    expect(obs?.snapshot).toBeDefined();
    const expiresAt = obs!.snapshot!.executionWindowExpiresAt;
    expect(expiresAt).toBe(obs!.snapshot!.qualifiedAt + 90000);

    // Tick at 45 seconds after initial observation: minor score fluctuation (e.g. score drops to 78) - candidate remains RIPE with healthy heartbeat
    const midCand = createTestCandidate("R_100", "UNDER_7", 78, 22, 3);
    engine.observeCandidates([midCand], baseTime + 45000);

    const midObs = engine.getPropositionObservation("R_100", "UNDER_7");
    expect(midObs?.currentStage).toBe("RIPE");
    expect(midObs?.snapshot?.executionWindowExpiresAt).toBe(expiresAt);
    expect(midObs?.executionHeartbeat?.status).toBe("HEALTHY");

    // Tick past 90 seconds from snapshot -> EXPIRED
    engine.observeCandidates([midCand], expiresAt + 5000);
    const expiredObs = engine.getPropositionObservation("R_100", "UNDER_7");
    expect(expiredObs?.currentStage).toBe("EXPIRED");
  });

  // Test 11: OPPORTUNITY qualifies without requiring full BEST_SETUP allPassed contract
  it("11. OPPORTUNITY qualifies without requiring full BEST_SETUP allPassed contract", () => {
    const engine = new ObservationLayerEngine();
    // Candidate with score 78, moderate stats (62%), stable momentum -> Qualifies as OPPORTUNITY
    const candidate = createTestCandidate("R_10", "UNDER_7", 78, 22, 3, {
      regimeObservation: {
        currentRegime: "CALM_STABLE",
        displayName: "Calm & Stable Market",
        isTransitioning: false,
        transitionProbability: 15,
        transitionState: "NONE",
        compatibility: {
          isCompatible: true,
          verdict: "COMPATIBLE",
          reason: "Compatible regime",
        },
        momentum: {
          momentumSide: "UNDER",
          momentumState: "STABLE", // Stable momentum (not accelerating)
          momentumStrength: 65,
        },
        regimeSpecificStats: {
          winRate: 64.0, // Moderate win rate
          sampleSize: 10,
          summary: "64% win rate under Calm",
        },
      } as any,
    });

    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_10", "UNDER_7");
    expect(obs?.currentStage).toBe("RIPE");
    expect(obs?.snapshot).toBeDefined();
    expect(obs?.snapshot?.initialValidityDurationSeconds).toBe(90);
  });

  // Test 12: Hard Veto blocks OPPORTUNITY and BEST_SETUP even with high score
  it("12. Hard Veto (HOSTILE losing pressure) blocks qualification", () => {
    const engine = new ObservationLayerEngine();
    const candidate = createTestCandidate("R_50", "UNDER_7", 85, 20, 3, {
      losingSide: {
        losingPressureLevel: "HOSTILE", // Hard Veto!
        aggregateLosingScore: 75,
        isHardBlocked: true,
      } as any,
    });

    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      engine.observeCandidates([candidate], now + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_50", "UNDER_7");
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.qualityBand).not.toBe("OPPORTUNITY");
    expect(obs?.qualityBand).not.toBe("BEST_SETUP");
  });
});
