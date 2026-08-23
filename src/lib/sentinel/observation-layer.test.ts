/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import { ObservationLayerEngine, PROPOSITIONS_LIST } from "./observation-layer";
import { SUPPORTED_MARKETS } from "../constants";
import { ContractType, OpportunityCandidate } from "../../types/sentinel";

function createMockCandidate(
  market: string,
  contract: ContractType,
  score: number = 50,
  dangerScore: number = 25,
  isHardBlocked: boolean = false,
  isVetoed: boolean = false,
  entryDigit: number | null = null,
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
    absoluteEdge: 4.5,
    relativeEdge: 2.0,
    dangerScore,
    persistenceScore: 70,
    stabilityScore: 75,
    freshnessScore: 80,
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
      aggregateLosingScore: 20,
      losingPressureLevel: "CALM",
      specialRiskActive: false,
      specialRiskDigit: null,
      specialRiskNote: "None",
      perDigitThreat: {},
      explanation: "Calm",
      isHardBlocked,
    },
    selectedEntryDigit: entryDigit as any,
    entryConfidence: 80,
    entryTrigger: {
      preferredTouch: "FIRST_TOUCH",
      triggerState: "ENTER_NOW",
      instruction: "Enter on first touch",
      confidence: 80,
      firstTouchWinRate: 76.0,
      wilsonLowerBound: 66.0,
      firstTouchSample: 15,
    } as any,
    validityWindowSeconds: 90,
    validUntil: Date.now() + 90000,
    pressureField: {
      window15: { netPressure: isUnder ? -1.8 : 1.8 },
      window30: { netPressure: isUnder ? -1.6 : 1.6 },
      window60: { netPressure: isUnder ? -1.4 : 1.4 },
      window120: { netPressure: isUnder ? -1.2 : 1.2 },
      profiles: {
        [entryDigit ?? 3]: { momentum: 0.8, exhaustion: false },
      },
    } as any,
    survivalMetrics: {
      market: "R_10",
      contract,
      entryDigit: (entryDigit ?? 3) as any,
      totalSequences: 50,
      run1WinRate: 85,
      run2WinRate: 75,
      run3WinRate: 65,
      run4WinRate: 50,
      run5WinRate: 40,
      firstRunLossRate: 15,
      continuationRate: 80,
      recoveryRate: 80,
      averageSurvivalRuns: 2.5,
      deteriorationPoint: 3,
      postEntryExpectancy: 0.45,
      postEntryDrawdown: 0.15,
      survivalLabel: "STRONG",
      isInsufficient: false,
    },
    simulatorStats: {
      totalTrades: 16,
      winRate: 77.5,
      expectancy: 1.2,
    } as any,
    governance: {
      vetoed: isVetoed || isHardBlocked,
      reasons: isVetoed ? ["Global Veto Triggered"] : [],
      marketSafe: !isVetoed,
      riskMultiplier: 1.0,
      action: isVetoed ? "STAND_DOWN" : "ALLOW",
    } as any,
    whyNumberOne: ["High directional edge"],
    invalidationConditions: ["Losing side spike"],
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
      stability: "STABLE",
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
        momentum_state: "ACCELERATING",
        momentumState: "ACCELERATING",
        momentum_side: isUnder ? "UNDER" : "OVER",
        momentumSide: isUnder ? "UNDER" : "OVER",
        momentum_strength: 0.8,
        momentumStrength: 0.8,
        momentum_acceleration: 0.5,
        momentum_confidence: 85,
        under_momentum: isUnder ? 0.8 : 0.2,
        over_momentum: isUnder ? 0.2 : 0.8,
      } as any,
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
        fallbackLevel: "DIRECT_MATCH",
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
        fallbackLevel: "DIRECT_MATCH",
        summary: "Direct regime match: 80% win rate",
      },
      lastUpdatedEpoch: Date.now(),
    },
    timestamp: Date.now(),
    ...overrides,
  } as unknown as OpportunityCandidate;
}

describe("ObservationLayerEngine - 20 Lifecycle & Psychology Tests", () => {
  // Test 1: Psychology formation
  it("1. detects early psychology formation and moves to FORMATION", () => {
    const engine = new ObservationLayerEngine();
    const cand = createMockCandidate("R_10", "UNDER_7", 52, 22, false, false, null);

    for (let i = 0; i < 10; i++) {
      engine.observeCandidates([cand], Date.now() + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_10", "UNDER_7");
    expect(obs?.currentStage).toBe("FORMATION");
    expect(obs?.dossier.psychologyEvolution.direction).toBe("UNDER");
  });

  // Test 2: Psychology strengthening
  it("2. detects psychology strengthening as alignment improves", () => {
    const engine = new ObservationLayerEngine();
    const cand = createMockCandidate("R_25", "OVER_2", 64, 20, false, false, 4);

    for (let i = 0; i < 18; i++) {
      engine.observeCandidates([cand], Date.now() + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_25", "OVER_2");
    expect(obs?.currentStage).toBe("DEVELOPING");
    expect(obs?.dossier.formationVelocity.strengtheningRate).toBeGreaterThanOrEqual(0);
  });

  // Test 3: Psychology deterioration
  it("3. detects psychology deterioration and regresses state cleanly", () => {
    const engine = new ObservationLayerEngine();
    const goodCand = createMockCandidate("R_50", "UNDER_7", 76, 20, false, false, 3);
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([goodCand], Date.now() + i * 1000);
    }
    expect(engine.getPropositionObservation("R_50", "UNDER_7")?.currentStage).toBe("RIPE");

    // Deteriorate score
    const badCand = createMockCandidate("R_50", "UNDER_7", 42, 45, false, false, 3);
    for (let i = 0; i < 4; i++) {
      engine.observeCandidates([badCand], Date.now() + (30 + i) * 1000);
    }
    const obs = engine.getPropositionObservation("R_50", "UNDER_7");
    expect(obs?.currentStage).not.toBe("RIPE");
  });

  // Test 4: Specific entry-digit validation
  it("4. validates specific entry digit against winning side and Wilson lower bound", () => {
    const engine = new ObservationLayerEngine();
    const cand = createMockCandidate("R_75", "UNDER_7", 76, 20, false, false, 3);
    engine.observeCandidates([cand], Date.now());

    const obs = engine.getPropositionObservation("R_75", "UNDER_7");
    expect(obs?.dossier.specificEntryDigit.isValidated).toBe(true);
    expect(obs?.dossier.specificEntryDigit.entryDigit).toBe(3);
    expect(obs?.dossier.specificEntryDigit.isWinningSide).toBe(true);
  });

  // Test 5: Losing-side pressure blocking
  it("5. blocks RIPE when opposing losing-side pressure is elevated / hostile", () => {
    const engine = new ObservationLayerEngine();
    const hostileCand = createMockCandidate("R_100", "UNDER_7", 78, 22, false, false, 3, {
      losingSide: {
        contract: "UNDER_7",
        losingDigits: [7, 8, 9] as any,
        winningDigits: [0, 1, 2, 3, 4, 5, 6] as any,
        aggregateLosingScore: 65,
        losingPressureLevel: "HOSTILE",
        specialRiskActive: true,
        specialRiskDigit: 8,
        specialRiskNote: "Losing digit 8 surging",
        perDigitThreat: {},
        explanation: "Surge in losing pressure",
        isHardBlocked: false,
      } as any,
    });

    for (let i = 0; i < 30; i++) {
      engine.observeCandidates([hostileCand], Date.now() + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_100", "UNDER_7");
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.dossier.explanation.whyWaiting).toMatch(/losing-side pressure|Losing pressure/i);
  });

  // Test 6: Pressure confirmation across 15/30/60/120
  it("6. confirms genuine multi-window pressure support across 15/30/60/120", () => {
    const engine = new ObservationLayerEngine();
    const cand = createMockCandidate("JD25", "OVER_2", 75, 20, false, false, 5);
    engine.observeCandidates([cand], Date.now());

    const obs = engine.getPropositionObservation("JD25", "OVER_2");
    expect(obs?.dossier.pressure.classification).toBe("GENUINE_SUPPORT");
  });

  // Test 7: Mixed-window pressure
  it("7. classifies conflicting pressure horizons as transitional / conflicting", () => {
    const engine = new ObservationLayerEngine();
    const mixedCand = createMockCandidate("JD50", "UNDER_7", 68, 25, false, false, 2, {
      pressureField: {
        window15: { netPressure: -1.8 },
        window30: { netPressure: 1.8 }, // Opposing
        window60: { netPressure: 1.5 }, // Opposing
        window120: { netPressure: -0.2 },
      } as any,
    });
    engine.observeCandidates([mixedCand], Date.now());

    const obs = engine.getPropositionObservation("JD50", "UNDER_7");
    expect(obs?.dossier.pressure.classification).toBe("LIKELY_REVERSAL");
  });

  // Test 8: Simulation confirmation
  it("8. confirms statistical simulation evidence when win rate and sample are high", () => {
    const engine = new ObservationLayerEngine();
    const cand = createMockCandidate("JD75", "UNDER_7", 76, 20, false, false, 3);
    engine.observeCandidates([cand], Date.now());

    const obs = engine.getPropositionObservation("JD75", "UNDER_7");
    expect(obs?.dossier.simulation.state).toBe("FAVOURABLE");
    expect(obs?.dossier.simulation.winRate).toBeGreaterThanOrEqual(75);
  });

  // Test 9: Insufficient simulation evidence
  it("9. marks simulation as INSUFFICIENT when trade sample is below 8", () => {
    const engine = new ObservationLayerEngine();
    const lowSampleCand = createMockCandidate("JD100", "OVER_2", 75, 20, false, false, 4, {
      simulatorStats: { totalTrades: 4, winRate: 80, expectancy: 1.2 } as any,
    });
    engine.observeCandidates([lowSampleCand], Date.now());

    const obs = engine.getPropositionObservation("JD100", "OVER_2");
    expect(obs?.dossier.simulation.state).toBe("INSUFFICIENT");
    expect(obs?.dossier.simulation.summary).toContain("INSUFFICIENT EVIDENCE");
  });

  // Test 10: RIPE transition
  it("10. transitions to RIPE when all 5 pillars and safety checks are fulfilled", () => {
    const engine = new ObservationLayerEngine();
    const ripeCand = createMockCandidate("R_10", "UNDER_7", 77, 18, false, false, 3);

    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([ripeCand], Date.now() + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_10", "UNDER_7");
    expect(obs?.currentStage).toBe("RIPE");
    expect(obs?.dossier.explanation.isRipe).toBe(true);
    expect(obs?.dossier.explanation.whyRipe.length).toBeGreaterThanOrEqual(5);
  });

  // Test 11: Opportunity expiration
  it("11. expires opportunity when time in execution window exceeds max validity", () => {
    const engine = new ObservationLayerEngine();
    const ripeCand = createMockCandidate("R_25", "UNDER_7", 78, 18, false, false, 3);

    const baseTime = Date.now();
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([ripeCand], baseTime + i * 1000);
    }
    expect(engine.getPropositionObservation("R_25", "UNDER_7")?.currentStage).toBe("RIPE");

    // Advance beyond 120 seconds
    engine.observeCandidates([ripeCand], baseTime + 130_000);
    const obs = engine.getPropositionObservation("R_25", "UNDER_7");
    expect(obs?.currentStage).toBe("EXPIRED");
  });

  // Test 12: Opportunity invalidation
  it("12. invalidates opportunity immediately if entry digit changes or breaks", () => {
    const engine = new ObservationLayerEngine();
    const ripeCand = createMockCandidate("R_50", "UNDER_7", 78, 18, false, false, 3);
    const baseTime = Date.now();
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([ripeCand], baseTime + i * 1000);
    }
    expect(engine.getPropositionObservation("R_50", "UNDER_7")?.currentStage).toBe("RIPE");

    // Invalidate entry digit (switches to losing side digit 8)
    const brokenCand = createMockCandidate("R_50", "UNDER_7", 78, 18, false, false, 8);
    engine.observeCandidates([brokenCand], baseTime + 29_000);

    const obs = engine.getPropositionObservation("R_50", "UNDER_7");
    expect(obs?.currentStage).toBe("INVALIDATED");
  });

  // Test 13: Veto overriding RIPE
  it("13. prevents RIPE immediately when global or risk veto is active", () => {
    const engine = new ObservationLayerEngine();
    const vetoedCand = createMockCandidate("R_75", "UNDER_7", 85, 15, false, true, 3);

    for (let i = 0; i < 30; i++) {
      engine.observeCandidates([vetoedCand], Date.now() + i * 1000);
    }

    const obs = engine.getPropositionObservation("R_75", "UNDER_7");
    expect(obs?.currentStage).toBe("VETOED");
  });

  // Test 14: Market isolation
  it("14. maintains strict candidate isolation across all 90 proposition cells", () => {
    const engine = new ObservationLayerEngine();
    const cand1 = createMockCandidate("R_10", "UNDER_6", 75, 20, false, false, 2);

    for (let i = 0; i < 30; i++) {
      engine.observeCandidates([cand1], Date.now() + i * 1000);
    }

    expect(engine.getPropositionObservation("R_10", "UNDER_6")?.totalObservations).toBe(30);
    expect(engine.getPropositionObservation("R_10", "UNDER_7")?.totalObservations).toBe(0);
    expect(engine.getPropositionObservation("R_25", "UNDER_6")?.totalObservations).toBe(0);
  });

  // Test 15: Entry-digit changes invalidating a stale opportunity
  it("15. detects entry digit displacement and invalidates stale setups", () => {
    const engine = new ObservationLayerEngine();
    const cand = createMockCandidate("R_100", "OVER_2", 77, 18, false, false, 5);
    const baseTime = Date.now();
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([cand], baseTime + i * 1000);
    }
    expect(engine.getPropositionObservation("R_100", "OVER_2")?.currentStage).toBe("RIPE");

    // Entry digit is displaced (null)
    const displacedCand = createMockCandidate("R_100", "OVER_2", 77, 18, false, false, null);
    engine.observeCandidates([displacedCand], baseTime + 30_000);

    const obs = engine.getPropositionObservation("R_100", "OVER_2");
    expect(obs?.currentStage).toBe("INVALIDATED");
  });

  // Test 16: Rapid setup formation
  it("16. accelerates formation when velocity is rapid and confirmations are consecutive", () => {
    const engine = new ObservationLayerEngine();
    const cand = createMockCandidate("JD25", "UNDER_7", 78, 18, false, false, 3);
    const baseTime = Date.now();

    for (let i = 0; i < 8; i++) {
      engine.observeCandidates([cand], baseTime + i * 1000);
    }

    const obs = engine.getPropositionObservation("JD25", "UNDER_7");
    expect(obs?.currentStage === "CONFIRMING" || obs?.currentStage === "RIPE").toBe(true);
  });

  // Test 17: Rapid setup decay
  it("17. transitions to DECAYING when score drops sharply", () => {
    const engine = new ObservationLayerEngine();
    const ripeCand = createMockCandidate("JD50", "UNDER_7", 78, 18, false, false, 3);
    const baseTime = Date.now();

    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([ripeCand], baseTime + i * 1000);
    }
    expect(engine.getPropositionObservation("JD50", "UNDER_7")?.currentStage).toBe("RIPE");

    // Sharp drop in score
    const decayingCand = createMockCandidate("JD50", "UNDER_7", 60, 32, false, false, 3);
    for (let i = 0; i < 3; i++) {
      engine.observeCandidates([decayingCand], baseTime + (30 + i) * 1000);
    }

    const obs = engine.getPropositionObservation("JD50", "UNDER_7");
    expect(obs?.currentStage).toBe("DECAYING");
  });

  // Test 18: Contradictory engine evidence
  it("18. flags material contradictions explicitly and blocks RIPE", () => {
    const engine = new ObservationLayerEngine();
    const conflictCand = createMockCandidate("JD75", "UNDER_7", 75, 20, false, false, 3, {
      digitPsychology: {
        verdict: "CONFLICT",
        reason: "Canonical psychology opposes direction",
        confidence: 40,
        hardBlock: false,
      } as any,
    });

    for (let i = 0; i < 30; i++) {
      engine.observeCandidates([conflictCand], Date.now() + i * 1000);
    }

    const obs = engine.getPropositionObservation("JD75", "UNDER_7");
    expect(obs?.currentStage).not.toBe("RIPE");
    expect(obs?.dossier.contradictionCount).toBeGreaterThanOrEqual(1);
  });

  // Test 19: Stale opportunity prevention
  it("19. does not promote single-tick temporary spikes to RIPE", () => {
    const engine = new ObservationLayerEngine();
    const spikeCand = createMockCandidate("JD100", "OVER_2", 92, 12, false, false, 4);

    engine.observeCandidates([spikeCand], Date.now());
    const obs = engine.getPropositionObservation("JD100", "OVER_2");
    expect(obs?.currentStage).not.toBe("RIPE");
  });

  // Test 20: Correct explanation generation
  it("20. generates intelligent dynamic explanations for waiting and ripe states", () => {
    const engine = new ObservationLayerEngine();
    const waitingCand = createMockCandidate("R_10", "UNDER_7", 55, 25, false, false, null);
    engine.observeCandidates([waitingCand], Date.now());

    const waitingObs = engine.getPropositionObservation("R_10", "UNDER_7");
    expect(waitingObs?.dossier.explanation.whyWaiting).toBeTruthy();

    const ripeCand = createMockCandidate("R_10", "UNDER_7", 78, 18, false, false, 3);
    for (let i = 0; i < 28; i++) {
      engine.observeCandidates([ripeCand], Date.now() + i * 1000);
    }

    const ripeObs = engine.getPropositionObservation("R_10", "UNDER_7");
    expect(ripeObs?.dossier.explanation.whyRipe.length).toBeGreaterThanOrEqual(5);
    expect(ripeObs?.dossier.explanation.whyRipe[0]).toContain("1,000-tick psychology");
  });
});
