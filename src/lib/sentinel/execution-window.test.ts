/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { ObservationLayerEngine } from "./observation-layer";
import { ContractType, OpportunityCandidate } from "../../types/sentinel";

function createMockCandidate(
  market: string,
  contract: ContractType,
  score: number = 87,
  dangerScore: number = 20,
  isHardBlocked: boolean = false,
  isVetoed: boolean = false,
  entryDigit: number | null = 3,
  overrides: Record<string, any> = {},
): OpportunityCandidate {
  const isUnder = contract.startsWith("UNDER");
  const barrier = parseInt(contract.split("_")[1], 10);

  return {
    id: `${market}_${contract}`,
    market,
    marketDisplayName: `${market} Index`,
    contract,
    direction: isUnder ? "UNDER" : "OVER",
    barrier,
    opportunityScore: score,
    confidence: Math.round(score * 0.9),
    absoluteEdge: 4.8,
    relativeEdge: 2.5,
    dangerScore,
    persistenceScore: 85,
    stabilityScore: 90,
    freshnessScore: 90,
    signalState: score >= 72 ? "STRONG" : score >= 58 ? "VALID" : "WATCH",
    engineAgreement: "SUPPORT",
    canonicalState: {
      totalTicks: 1000,
      evenPercentage: 50,
      oddPercentage: 50,
      greenDigit: isUnder ? 3 : 7,
      secondGreenDigit: isUnder ? 2 : 8,
      redDigit: isUnder ? 8 : 1,
      secondRedDigit: isUnder ? 9 : 0,
      mostIncreasingDigit: isUnder ? 3 : 7,
      mostDecreasingDigit: isUnder ? 8 : 1,
      lastUpdated: Date.now(),
      entropy: 0.95,
      digitStats: {
        0: { digit: 0, percentage: 10, ticksSinceLast: 4, recentCount20: 2 },
        1: { digit: 1, percentage: 10, ticksSinceLast: 3, recentCount20: 2 },
        2: { digit: 2, percentage: 10, ticksSinceLast: 2, recentCount20: 2 },
        3: { digit: 3, percentage: 10, ticksSinceLast: 1, recentCount20: 2 },
        4: { digit: 4, percentage: 10, ticksSinceLast: 5, recentCount20: 2 },
        5: { digit: 5, percentage: 10, ticksSinceLast: 6, recentCount20: 2 },
        6: { digit: 6, percentage: 10, ticksSinceLast: 7, recentCount20: 2 },
        7: { digit: 7, percentage: 10, ticksSinceLast: 8, recentCount20: 2 },
        8: { digit: 8, percentage: 10, ticksSinceLast: 9, recentCount20: 2 },
        9: { digit: 9, percentage: 10, ticksSinceLast: 10, recentCount20: 2 },
      } as any,
    },
    digitPsychology: {
      verdict: "SUPPORT",
      reason: "1000-tick psychology aligns with contract edge.",
      confidence: 85,
      greenDigit: isUnder ? 3 : 7,
      secondGreenDigit: isUnder ? 2 : 8,
      redDigit: isUnder ? 8 : 1,
      secondRedDigit: isUnder ? 9 : 0,
      mostIncreasingDigit: isUnder ? 3 : 7,
      mostDecreasingDigit: isUnder ? 8 : 1,
      hardBlock: isHardBlocked,
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
      explanation: "Calm losing side",
      isHardBlocked,
    },
    selectedEntryDigit: entryDigit as any,
    entryConfidence: 85,
    entryTrigger: {
      preferredTouch: "FIRST_TOUCH",
      triggerState: "ENTER_NOW",
      instruction: "Enter on first touch of Digit 3",
      firstTouchWinRate: 78.0,
      wilsonLowerBound: 68.0,
      firstTouchSample: 16,
      subsequentTouchWinRate: 65.0,
      subsequentTouchSample: 8,
      measuredMeanGap: 3.8,
      expectancyAdvantage: 4.2,
      rankingModifier: 8,
    },
    pressureField: {
      summary: "Strong aligned winning pressure",
      winningPressure: "STRONG",
      losingPressure: "CALM",
      neutralPressure: "NORMAL",
    } as any,
    winningMomentum: {
      state: "ACCELERATING",
      intensity: 85,
      persistence: 80,
    } as any,
    evidenceProfile: {
      regime: "CALM",
      evidenceMaturity: "MATURE",
      scoreConsistency: 85,
    } as any,
    governance: {
      verdict: isVetoed ? "VETOED" : "CLEAR",
      vetoed: isVetoed,
      vetoRule: null,
      patternRisk: {
        key: "MOCK_KEY",
        tags: [],
        riskLevel: "NONE",
        n: 10,
        wins: 9,
        losses: 1,
        lossRate: 0.1,
        marketBreadth: 3,
        note: "Low risk profile",
      },
      suggestedPenalty: 0,
      reasons: isVetoed ? ["Manual Operator Veto"] : [],
    },
    validityWindowSeconds: 90,
    validUntil: Date.now() + 90000,
    executionState: "RIPE",
    survivalMetrics: {
      market,
      contract,
      entryDigit: (entryDigit ?? 3) as any,
      totalSequences: 20,
      run1WinRate: 85.0,
      run2WinRate: 75.0,
      run3WinRate: 60.0,
      run4WinRate: 50.0,
      run5WinRate: 40.0,
      firstRunLossRate: 15.0,
      continuationRate: 88,
      recoveryRate: 70,
      averageSurvivalRuns: 3.2,
      deteriorationPoint: 3,
      postEntryExpectancy: 0.25,
      postEntryDrawdown: 8.5,
      survivalLabel: "STRONG",
      isInsufficient: false,
    },
    whyNumberOne: ["Score 87", "High edge"],
    invalidationConditions: ["Danger spike"],
    whyRunnerUpLost: "Lower statistical expectancy",
    regimeObservation: {
      currentRegime: "CALM_STABLE",
      current_regime: "CALM_STABLE",
      previousRegime: null,
      previous_regime: null,
      displayName: "CALM/STABLE",
      display_name: "CALM/STABLE",
      legacyRegime: "CALM",
      confidence: 85,
      regime_confidence: 85,
      regimeAgeTicks: 30,
      regime_age: 30,
      regimeAgeMs: 30000,
      regime_age_ms: 30000,
      stability: "HIGH",
      stabilityScore: 85,
      regime_stability: 0.85,
      maturity: "ESTABLISHED",
      regime_maturity: "ESTABLISHED",
      transition_state: "NONE",
      transitionState: "NONE",
      transition_from: null,
      transitionFrom: null,
      transition_to: null,
      transitionTo: null,
      transitionProbability: 10,
      transition_probability: 10,
      transitionConfidence: 80,
      transition_confidence: 80,
      transitionAge: 0,
      transition_age: 0,
      activeTransition: "STABLE_IN_REGIME",
      transitionDisplayName: "STABLE IN REGIME",
      transition_display_name: "STABLE IN REGIME",
      isTransitioning: false,
      is_transitioning: false,
      candidateProbabilities: { CALM_STABLE: 0.85 } as any,
      candidate_probabilities: { CALM_STABLE: 0.85 } as any,
      momentum: {
        momentum_side: isUnder ? "UNDER" : "OVER",
        momentumSide: isUnder ? "UNDER" : "OVER",
        momentum_state: "ACCELERATING",
        momentumState: "ACCELERATING",
        momentum_strength: 0.8,
        momentumStrength: 0.8,
        momentum_acceleration: 0.5,
        momentumAcceleration: 0.5,
        momentum_confidence: 85,
        momentumConfidence: 85,
        under_momentum_score: isUnder ? 0.8 : 0.2,
        underMomentumScore: isUnder ? 0.8 : 0.2,
        over_momentum_score: isUnder ? 0.2 : 0.8,
        overMomentumScore: isUnder ? 0.2 : 0.8,
        regime_momentum_alignment: "ALIGNED",
        regimeMomentumAlignment: "ALIGNED",
      },
      momentum_side: isUnder ? "UNDER" : "OVER",
      momentum_state: "ACCELERATING",
      momentum_strength: 0.8,
      momentum_acceleration: 0.5,
      momentum_confidence: 85,
      evidence: ["High stability"],
      supportingEvidence: ["High stability"],
      supporting_evidence: ["High stability"],
      conflictingEvidence: [],
      conflicting_evidence: [],
      regimeSpecificEvidence: ["80% win rate"],
      regime_specific_evidence: ["80% win rate"],
      evidenceFreshness: 0.9,
      evidence_freshness: 0.9,
      lastRegimeChange: Date.now() - 30000,
      last_regime_change: Date.now() - 30000,
      compatibility: {
        isCompatible: true,
        compatibilityScore: 85,
        verdict: "COMPATIBLE",
        reason: "Regime fully aligns with setup",
        staleEvidenceDiscount: 0,
      },
      regimeSpecificStats: {
        comboKey: "KEY",
        regime: "CALM_STABLE",
        sampleSize: 20,
        effectiveSampleSize: 20,
        winRate: 80,
        wilsonLowerBound: 70,
        isSufficientSample: true,
        discountedWinRate: 80,
        freshness: 0.9,
        fallbackLevel: "EXACT_COMBO",
        summary: "Direct regime match: 80% win rate",
      },
      regime_specific_stats: {
        comboKey: "KEY",
        regime: "CALM_STABLE",
        sampleSize: 20,
        effectiveSampleSize: 20,
        winRate: 80,
        wilsonLowerBound: 70,
        isSufficientSample: true,
        discountedWinRate: 80,
        freshness: 0.9,
        fallbackLevel: "EXACT_COMBO",
        summary: "Direct regime match: 80% win rate",
      },
      lastUpdatedEpoch: Date.now(),
    },
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("Sentinel Minimum 90-Second Qualified Execution Window", () => {
  it("qualifies opportunity and captures immutable execution snapshot with all required fields", () => {
    const engine = new ObservationLayerEngine();
    const tStart = 1700000000000;

    // 1. Advance to qualify (28 consecutive ticks)
    const candidate = createMockCandidate("R_100", "UNDER_7", 87, 20);
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([candidate], tStart + i * 1000);
    }
    const { propositionStates } = engine.observeCandidates([candidate], tStart + 28000);

    const prop = propositionStates.get("R_100_UNDER_7")!;
    expect(prop.currentStage).toBe("RIPE");
    expect(prop.snapshot).not.toBeNull();

    const snap = prop.snapshot!;
    const qualifiedAt = snap.qualifiedAt;
    // Exact required fields verification
    expect(snap.qualifiedAt).toBeGreaterThanOrEqual(tStart);
    expect(snap.qualificationScore).toBe(87);
    expect(snap.scoreAtQualification).toBe(87);
    expect(snap.qualificationConfidence).toBeGreaterThanOrEqual(75);
    expect(snap.qualificationRegime).toBeDefined();
    expect(snap.qualificationRegimeConfidence).toBeGreaterThan(0);
    expect(snap.qualificationMomentum).toBeDefined();
    expect(snap.qualificationDigit).toBe(3);
    expect(snap.entryDigit).toBe(3);
    expect(snap.qualificationTrigger).toBeDefined();
    expect(snap.touchRule).toBe("FIRST_TOUCH");
    expect(snap.executionWindowStartedAt).toBe(qualifiedAt);
    expect(snap.executionWindowExpiresAt).toBe(qualifiedAt + 90000);
    expect(snap.initialValidityDurationSeconds).toBe(90);

    // Initial heartbeat
    expect(prop.executionHeartbeat).not.toBeNull();
    expect(prop.executionHeartbeat?.status).toBe("HEALTHY");
    expect(prop.executionHeartbeat?.qualificationScore).toBe(87);
    expect(prop.executionHeartbeat?.liveHealthScore).toBe(87);
    expect(prop.executionHeartbeat?.scoreDrift).toBe(0);
  });

  it("satisfies Mandatory Test Scenario: T0 -> T+10 -> T+30 -> T+45 -> T+60 -> T+90", () => {
    const engine = new ObservationLayerEngine();
    const tStart = 1700000000000;

    // Advance until setup qualifies to RIPE
    let candidate = createMockCandidate("R_100", "UNDER_7", 87, 20);
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([candidate], tStart + i * 1000);
    }
    let res = engine.observeCandidates([candidate], tStart + 28000);
    let prop = res.propositionStates.get("R_100_UNDER_7")!;

    expect(prop.currentStage).toBe("RIPE");
    const t0 = prop.snapshot!.qualifiedAt;
    expect(prop.snapshot?.qualificationScore).toBe(87);
    expect(prop.snapshot?.executionWindowExpiresAt).toBe(t0 + 90000);
    expect(prop.executionHeartbeat?.status).toBe("HEALTHY");
    expect(prop.executionHeartbeat?.liveHealthScore).toBe(87);

    // T+10: Live score dips to 54 (Minor fluctuation during execution window)
    const t10 = t0 + 10000;
    candidate = createMockCandidate("R_100", "UNDER_7", 54, 25);
    res = engine.observeCandidates([candidate], t10);
    prop = res.propositionStates.get("R_100_UNDER_7")!;

    // MUST NOT reset or roll forward qualification!
    expect(prop.snapshot?.qualificationScore).toBe(87);
    expect(prop.snapshot?.qualifiedAt).toBe(t0);
    expect(prop.snapshot?.executionWindowExpiresAt).toBe(t0 + 90000);
    // Live health reflects current score independently
    expect(prop.executionHeartbeat?.qualificationScore).toBe(87);
    expect(prop.executionHeartbeat?.liveHealthScore).toBe(54);
    expect(prop.executionHeartbeat?.scoreDrift).toBe(-33);
    expect(prop.executionHeartbeat?.status).toBe("AT_RISK");
    expect(prop.executionHeartbeat?.remainingSeconds).toBe(80);
    expect(prop.executionHeartbeat?.explanation).toContain("live conditions have weakened");

    // T+30: Live score recovers to 82
    const t30 = t0 + 30000;
    candidate = createMockCandidate("R_100", "UNDER_7", 82, 22);
    res = engine.observeCandidates([candidate], t30);
    prop = res.propositionStates.get("R_100_UNDER_7")!;

    expect(prop.snapshot?.qualificationScore).toBe(87);
    expect(prop.snapshot?.qualifiedAt).toBe(t0);
    expect(prop.executionHeartbeat?.qualificationScore).toBe(87);
    expect(prop.executionHeartbeat?.liveHealthScore).toBe(82);
    expect(prop.executionHeartbeat?.status).toBe("HEALTHY");
    expect(prop.executionHeartbeat?.remainingSeconds).toBe(60);

    // T+45: Minor score dip to 60
    const t45 = t0 + 45000;
    candidate = createMockCandidate("R_100", "UNDER_7", 60, 24);
    res = engine.observeCandidates([candidate], t45);
    prop = res.propositionStates.get("R_100_UNDER_7")!;

    expect(prop.snapshot?.qualificationScore).toBe(87);
    expect(prop.executionHeartbeat?.liveHealthScore).toBe(60);
    expect(prop.executionHeartbeat?.status).toBe("AT_RISK");
    expect(prop.executionHeartbeat?.remainingSeconds).toBe(45);

    // T+60: Normal conditions, score 75
    const t60 = t0 + 60000;
    candidate = createMockCandidate("R_100", "UNDER_7", 75, 20);
    res = engine.observeCandidates([candidate], t60);
    prop = res.propositionStates.get("R_100_UNDER_7")!;

    expect(prop.snapshot?.qualificationScore).toBe(87);
    expect(prop.executionHeartbeat?.liveHealthScore).toBe(75);
    expect(prop.executionHeartbeat?.status).toBe("HEALTHY");
    expect(prop.executionHeartbeat?.remainingSeconds).toBe(30);

    // T+90: Expiration of 90-second execution window
    const t90 = t0 + 90000;
    candidate = createMockCandidate("R_100", "UNDER_7", 78, 20);
    res = engine.observeCandidates([candidate], t90);
    prop = res.propositionStates.get("R_100_UNDER_7")!;

    expect(prop.currentStage).toBe("EXPIRED");
    expect(prop.executionHeartbeat?.status).toBe("EXPIRED");
    expect(prop.executionHeartbeat?.remainingSeconds).toBe(0);
  });

  it("immediately invalidates if a material veto or danger spike occurs during active window", () => {
    const engine = new ObservationLayerEngine();
    const t0 = 1700000000000;

    let candidate = createMockCandidate("R_100", "UNDER_7", 87, 20);
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([candidate], t0 - (28 - i) * 1000);
    }
    engine.observeCandidates([candidate], t0);

    // T+20: Material danger spike (danger = 65)
    const t20 = t0 + 20000;
    candidate = createMockCandidate("R_100", "UNDER_7", 87, 65);
    const res = engine.observeCandidates([candidate], t20);
    const prop = res.propositionStates.get("R_100_UNDER_7")!;

    expect(prop.currentStage).toBe("INVALIDATED");
    expect(prop.executionHeartbeat?.status).toBe("INVALIDATED");
    expect(prop.executionHeartbeat?.isHardInvalidated).toBe(true);
  });
});
