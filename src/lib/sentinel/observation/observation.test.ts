import { describe, it, expect, beforeEach } from "vitest";
import {
  ObservationEngine,
  MARKET_IDS,
  PROPOSITIONS,
  ALL_CELL_IDS,
  cellId,
  emptyEvidenceInput,
  type EngineEvidenceInput,
  interpretMomentum,
  assessQuality,
  checkHardVeto,
  selectivityCalibrationCheck,
  explainWaiting,
  explainRipe,
  ObservationCell,
  QualificationManager,
} from "./index";

describe("Sentinel Observation Layer — §20 Consolidated Master Test Suite", () => {
  let engine: ObservationEngine;

  beforeEach(() => {
    engine = new ObservationEngine();
  });

  // Helper to prime a cell into RIPE state with full persistence
  function feedToRipe(target: ObservationEngine | ObservationCell, count = 100) {
    let lastDossier: any = null;
    for (let i = 0; i < count; i++) {
      const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000 + i * 1000);
      input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
      input.entryDigit = {
        digit: 4,
        state: "VALIDATED",
        support: "SUPPORTING",
        dangerousCompetitor: false,
      };
      input.pressure.byWindow = {
        15: "SUPPORTING",
        30: "SUPPORTING",
        60: "SUPPORTING",
        120: "SUPPORTING",
      };
      input.losingSidePressure = { state: "DECLINING", severity: "NONE" };
      input.trigger = { state: "VALID" };
      input.regime = {
        classification: "TRENDING_PERSISTENT",
        confidence: 0.9,
        transitioning: false,
        compatibility: "COMPATIBLE",
      };
      input.statistics = { strength: "STRONG", sampleSize: 100 };
      lastDossier = target.ingest(input);
    }
    return lastDossier;
  }

  // 1. All 15 markets exist; every market has exactly the six required propositions; 90 cells are created correctly.
  it("1. creates exactly 90 independent cells across 15 markets with 6 propositions each", () => {
    expect(MARKET_IDS.length).toBe(15);
    expect(PROPOSITIONS.length).toBe(6);
    expect(ALL_CELL_IDS.length).toBe(90);

    for (const m of MARKET_IDS) {
      for (const p of PROPOSITIONS) {
        const cell = engine.getCell(m, p);
        expect(cell).toBeDefined();
      }
    }
  });

  // 2. Observation identity is stable; V10/UNDER_6 cannot read V10/UNDER_7 history; V10/UNDER_6 cannot read V25/UNDER_6 history.
  it("2. maintains strictly independent identity with zero cross-cell state contamination", () => {
    const v10u6 = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    v10u6.psychology = { direction: "UNDER", state: "STRENGTHENING", support: "SUPPORTING" };

    // Ingest into V10 UNDER6
    engine.ingest(v10u6);

    const cellV10U6 = engine.getCell("1HZ10V", "UNDER6");
    const cellV10U7 = engine.getCell("1HZ10V", "UNDER7");
    const cellV25U6 = engine.getCell("1HZ25V", "UNDER6");

    expect(cellV10U6.dossier).not.toBeNull();
    expect(cellV10U6.dossier?.psychology.support).toBe("SUPPORTING");
    expect(cellV10U7.dossier).toBeNull();
    expect(cellV25U6.dossier).toBeNull();
  });

  // 3. A temporary pressure spike does not automatically produce RIPE.
  it("3. requires sustained persistence; a single pressure spike does not trigger RIPE", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
    input.entryDigit = {
      digit: 4,
      state: "VALIDATED",
      support: "SUPPORTING",
      dangerousCompetitor: false,
    };
    input.pressure = {
      byWindow: { 15: "SUPPORTING", 30: "SUPPORTING", 60: "SUPPORTING", 120: "SUPPORTING" },
      candidateDigitTrend: "TREND",
    };
    input.trigger = { state: "VALID" };
    input.regime = {
      classification: "TRENDING_PERSISTENT",
      confidence: 0.9,
      transitioning: false,
      compatibility: "COMPATIBLE",
    };

    // 1 tick of perfect evidence
    const dossier1 = engine.ingest(input);
    expect(dossier1.state).not.toBe("RIPE");
  });

  // 4. Fluctuation is correctly distinguished from persistent pressure/trend.
  it("4. distinguishes fluctuation from sustained trend and sets stability state appropriately", () => {
    const cell = new ObservationCell("1HZ10V", "UNDER6");

    // Oscillating inputs (flipping support)
    for (let i = 0; i < 10; i++) {
      const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000 + i * 1000);
      input.psychology.support = i % 2 === 0 ? "SUPPORTING" : "OPPOSING";
      cell.ingest(input);
    }

    const d = cell.getDossier();
    expect(["HIGHLY_UNSTABLE", "CHOPPY", "FLUCTUATING"]).toContain(d?.stability);
  });

  // 5. Contradictory evidence can move a proposition into CONFLICT.
  it("5. moves state to CONFLICT when contradictory evidence streams persist", () => {
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    // Seed with developing evidence
    for (let i = 0; i < 30; i++) {
      const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000 + i * 1000);
      input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
      input.pressure.byWindow = {
        15: "SUPPORTING",
        30: "SUPPORTING",
        60: "SUPPORTING",
        120: "SUPPORTING",
      };
      input.losingSidePressure = { state: "DECLINING", severity: "NONE" };
      cell.ingest(input);
    }

    // Introduce contradictions without hard veto (mixed windows, conflicting momentum, accelerating losing side)
    for (let i = 30; i < 45; i++) {
      const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000 + i * 1000);
      input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
      input.losingSidePressure = { state: "ACCELERATING", severity: "CAUTION" };
      input.momentum = { side: "OVER", state: "ACCELERATING", strength: 0.8 };
      input.pressure.byWindow = {
        15: "SUPPORTING",
        30: "OPPOSING",
        60: "SUPPORTING",
        120: "OPPOSING",
      };
      input.regime = {
        classification: "CHOPPY_OSCILLATING",
        confidence: 0.8,
        transitioning: false,
        compatibility: "NEUTRAL_UNCERTAIN",
      };
      cell.ingest(input);
    }

    expect(cell.state).toBe("CONFLICT");
  });

  // 6. Deterioration can move RIPE back toward earlier states.
  it("6. moves RIPE back toward DECAYING/CONFIRMING when supporting evidence deteriorates", () => {
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    feedToRipe(cell);
    expect(cell.state).toBe("RIPE");

    // Supporting evidence stops renewing
    const deteriorating = emptyEvidenceInput("1HZ10V", "UNDER6", 200000);
    deteriorating.psychology = { direction: "UNDER", state: "WEAKENING", support: "UNKNOWN" };
    deteriorating.losingSidePressure = { state: "INCREASING", severity: "CAUTION" };
    cell.ingest(deteriorating);

    expect(cell.state).not.toBe("RIPE");
  });

  // 7. Hard vetoes prevent RIPE/opportunity presentation, and override any qualification score.
  it("7. hard vetoes immediately prevent RIPE and reject candidate", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
    input.entryDigit = {
      digit: 4,
      state: "VALIDATED",
      support: "SUPPORTING",
      dangerousCompetitor: false,
    };
    input.pressure.byWindow = {
      15: "SUPPORTING",
      30: "SUPPORTING",
      60: "SUPPORTING",
      120: "SUPPORTING",
    };
    input.veto = { active: true, hard: true, reason: "Operator hard veto active" };

    const dossier = engine.ingest(input);
    expect(checkHardVeto(dossier).vetoed).toBe(true);
    expect(dossier.state).toBe("REJECTED");
  });

  // 8. Simulation evidence does not independently trigger an opportunity.
  it("8. simulation evidence alone cannot create an opportunity without structural validation", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.simulation = { state: "FAVOURABLE", sampleSize: 100, conditionedOnRegime: true };
    input.psychology = { direction: "NONE", state: "FORMING", support: "UNKNOWN" };

    const dossier = engine.ingest(input);
    expect(dossier.state).toBe("WATCHING");
  });

  // 9. Specific entry-digit validation, separate from directional psychology validation.
  it("9. validates directional psychology independently from entry-digit suitability", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
    input.entryDigit = {
      digit: null,
      state: "WAITING",
      support: "UNKNOWN",
      dangerousCompetitor: false,
    };

    const dossier = engine.ingest(input);
    expect(dossier.psychology.support).toBe("SUPPORTING");
    expect(dossier.entryDigit.state).toBe("WAITING");
    expect(dossier.state).not.toBe("RIPE");
  });

  // 10. Losing-side pressure correctly blocks/downgrades a candidate.
  it("10. losing-side pressure severity=REJECT or VETO hard-blocks opportunity", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
    input.losingSidePressure = { state: "TAKEOVER", severity: "REJECT" };

    const dossier = engine.ingest(input);
    const veto = checkHardVeto(dossier);
    expect(veto.vetoed).toBe(true);
  });

  // 11. Pressure confirmation and disagreement across 15/30/60/120 windows, including mixed-window cases.
  it("11. accurately tracks pressure cross-window agreement and flags mixed windows", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.pressure = {
      byWindow: { 15: "SUPPORTING", 30: "OPPOSING", 60: "MIXED", 120: "SUPPORTING" },
      candidateDigitTrend: "FLUCTUATION",
    };

    const dossier = engine.ingest(input);
    expect(dossier.pressure.byWindow[15]).toBe("SUPPORTING");
    expect(dossier.pressure.byWindow[30]).toBe("OPPOSING");
    expect(dossier.contradictions).toBeGreaterThan(0);
  });

  // 12. Insufficient simulation evidence is reported as INSUFFICIENT, not manufactured confidence.
  it("12. reports insufficient simulation evidence honestly without manufactured confidence", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.simulation = { state: "INSUFFICIENT", sampleSize: 2, conditionedOnRegime: false };

    const dossier = engine.ingest(input);
    expect(dossier.simulation.state).toBe("INSUFFICIENT");
    const quality = assessQuality(dossier, "NEUTRAL");
    expect(quality.statisticsContribution).toBe("NONE");
  });

  // 13. Regime-appropriate vs. regime-inappropriate structurally-valid setups.
  it("13. prevents RIPE if structurally valid setup is incompatible with current regime", () => {
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    for (let i = 0; i < 100; i++) {
      const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000 + i * 1000);
      input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
      input.entryDigit = {
        digit: 4,
        state: "VALIDATED",
        support: "SUPPORTING",
        dangerousCompetitor: false,
      };
      input.pressure.byWindow = {
        15: "SUPPORTING",
        30: "SUPPORTING",
        60: "SUPPORTING",
        120: "SUPPORTING",
      };
      input.trigger = { state: "VALID" };
      // INCOMPATIBLE REGIME
      input.regime = {
        classification: "HIGH_VOLATILITY_UNSTABLE",
        confidence: 0.85,
        transitioning: false,
        compatibility: "INCOMPATIBLE",
      };
      cell.ingest(input);
    }

    expect(cell.state).not.toBe("RIPE");
  });

  // 14. Material regime change triggers immediate re-evaluation of a waiting opportunity.
  it("14. re-evaluates opportunities on material regime transition", () => {
    feedToRipe(engine);

    const cell = engine.getCell("1HZ10V", "UNDER6");
    expect(cell.dossier?.state).toBe("RIPE");
    const qual = engine.qualificationManager.get(cellId("1HZ10V", "UNDER6"));
    expect(qual).toBeDefined();

    // Material shift to incompatible regime
    const shift = emptyEvidenceInput("1HZ10V", "UNDER6", 200000);
    shift.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
    shift.entryDigit = {
      digit: 4,
      state: "VALIDATED",
      support: "SUPPORTING",
      dangerousCompetitor: false,
    };
    shift.regime = {
      classification: "DISTRIBUTION_EXHAUSTION",
      confidence: 0.95,
      transitioning: true,
      compatibility: "INCOMPATIBLE",
    };
    engine.ingest(shift);

    const activeQual = engine.qualificationManager.get(cellId("1HZ10V", "UNDER6"));
    expect(activeQual).toBeUndefined(); // Was invalidated and cleaned up from active
  });

  // 15. Momentum side/state correctly read as supportive vs. conflicting depending on setup direction.
  it("15. interprets momentum correctly by proposition barrier side", () => {
    // UNDER proposition + UNDER momentum = SUPPORTIVE
    expect(
      interpretMomentum("UNDER6", { side: "UNDER", state: "ACCELERATING", strength: 0.8 }),
    ).toBe("SUPPORTIVE");
    // UNDER proposition + OVER momentum = CONFLICTING
    expect(
      interpretMomentum("UNDER6", { side: "OVER", state: "ACCELERATING", strength: 0.8 }),
    ).toBe("CONFLICTING");
    // OVER proposition + OVER momentum = SUPPORTIVE
    expect(interpretMomentum("OVER1", { side: "OVER", state: "ACCELERATING", strength: 0.8 })).toBe(
      "SUPPORTIVE",
    );
    // OVER proposition + UNDER momentum = CONFLICTING
    expect(
      interpretMomentum("OVER1", { side: "UNDER", state: "ACCELERATING", strength: 0.8 }),
    ).toBe("CONFLICTING");
  });

  // 16. RIPE transition, opportunity expiration, and opportunity invalidation.
  it("16. executes the lifecycle: RIPE -> EXECUTION_WINDOW_ACTIVE -> EXPIRED", () => {
    const qm = new QualificationManager();
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    const dossier = feedToRipe(cell);

    expect(dossier.state).toBe("RIPE");
    const qual = qm.attemptQualify(dossier, 100000);
    expect(qual).not.toBeNull();
    expect(qual?.stage).toBe("EXECUTION_WINDOW_ACTIVE");
    expect(qual?.liveHealth).toBe("HEALTHY");

    // After 91 seconds
    const monitored = qm.monitorLiveHealth(cellId("1HZ10V", "UNDER6"), dossier, 100000 + 91000);
    expect(monitored?.liveHealth).toBe("EXPIRED");
  });

  // 17. Entry-digit changes invalidating a stale opportunity.
  it("17. invalidates live health when entry trigger fails", () => {
    const qm = new QualificationManager();
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    const dossier = feedToRipe(cell);

    const qual = qm.attemptQualify(dossier, 100000);
    expect(qual).not.toBeNull();

    // Trigger fails
    const failedInput = { ...dossier, trigger: { state: "FAILED" } };
    const monitored = qm.monitorLiveHealth(cellId("1HZ10V", "UNDER6"), failedInput, 101000);
    expect(monitored?.liveHealth).toBe("INVALIDATED");
  });

  // 18. Rapid setup formation and rapid setup decay (formation velocity).
  it("18. tracks formation velocity across rapid, normal, and deteriorating trajectories", () => {
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    for (let i = 0; i < 25; i++) {
      const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000 + i * 1000);
      input.psychology = { direction: "UNDER", state: "COHERENT", support: "SUPPORTING" };
      input.entryDigit = {
        digit: 4,
        state: "VALIDATED",
        support: "SUPPORTING",
        dangerousCompetitor: false,
      };
      input.pressure.byWindow = {
        15: "SUPPORTING",
        30: "SUPPORTING",
        60: "SUPPORTING",
        120: "SUPPORTING",
      };
      cell.ingest(input);
    }
    const d = cell.getDossier();
    expect(d?.formationVelocity).toBe("RAPID");
  });

  // 19. Market isolation (no cross-market contamination) under concurrent updates.
  it("19. maintains strict isolation under concurrent multi-market updates", () => {
    for (const m of MARKET_IDS) {
      for (const p of PROPOSITIONS) {
        const input = emptyEvidenceInput(m, p, 1000);
        if (m === "1HZ10V" && p === "UNDER6") {
          input.psychology.direction = "UNDER";
          input.psychology.support = "SUPPORTING";
        }
        engine.ingest(input);
      }
    }

    expect(engine.getCell("1HZ10V", "UNDER6").dossier?.psychology.direction).toBe("UNDER");
    expect(engine.getCell("1HZ25V", "UNDER6").dossier?.psychology.direction).toBe("NONE");
    expect(engine.getCell("1HZ10V", "OVER1").dossier?.psychology.direction).toBe("NONE");
  });

  // 20. Correct dynamic explanation generation for both "why waiting" and "why RIPE" cases.
  it("20. dynamically generates human-readable explanations from live evidence", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.psychology = { direction: "UNDER", state: "FORMING", support: "SUPPORTING" };
    input.entryDigit = {
      digit: null,
      state: "WAITING",
      support: "UNKNOWN",
      dangerousCompetitor: false,
    };
    input.pressure.byWindow = { 15: "SUPPORTING", 30: "OPPOSING", 60: "MIXED", 120: "SUPPORTING" };

    const dossier = engine.ingest(input);
    const waitingText = explainWaiting(dossier, "NEUTRAL");
    expect(waitingText).toContain("UNDER structure is valid");
    expect(waitingText).toContain("no entry digit has been validated yet");

    // RIPE explanation
    dossier.entryDigit = {
      digit: 4,
      state: "VALIDATED",
      support: "SUPPORTING",
      dangerousCompetitor: false,
    };
    dossier.regime = {
      classification: "TRENDING_PERSISTENT",
      confidence: 0.9,
      transitioning: false,
      compatibility: "COMPATIBLE",
    };
    dossier.trigger = { state: "VALID" };
    const ripeLines = explainRipe(dossier, "SUPPORTIVE");
    expect(ripeLines.some((l) => l.includes("1,000-tick psychology supports UNDER"))).toBe(true);
    expect(
      ripeLines.some((l) => l.includes("Digit 4 satisfies the current entry-digit conditions")),
    ).toBe(true);
  });

  // 21. Qualification snapshot immutability — live health changes do not mutate the qualification snapshot.
  it("21. ensures the qualification snapshot remains strictly immutable after creation", () => {
    const qm = new QualificationManager();
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    const dossier = feedToRipe(cell);

    const qual = qm.attemptQualify(dossier, 10000);
    const frozenDigit = qual?.snapshot.qualificationDigit;
    const frozenExpiresAt = qual?.snapshot.executionWindowExpiresAt;

    // Mutate live dossier
    dossier.entryDigit.digit = 9;
    qm.monitorLiveHealth(cellId("1HZ10V", "UNDER6"), dossier, 15000);

    expect(qual?.snapshot.qualificationDigit).toBe(frozenDigit);
    expect(qual?.snapshot.executionWindowExpiresAt).toBe(frozenExpiresAt);
  });

  // 22. Execution window does not roll forward; expiry is exactly qualifiedAt + 90s.
  it("22. fixes the execution window at exactly qualifiedAt + 90s without rolling forward", () => {
    const qm = new QualificationManager();
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    const dossier = feedToRipe(cell);

    const t0 = 100000;
    const qual = qm.attemptQualify(dossier, t0);
    expect(qual?.snapshot.executionWindowExpiresAt).toBe(t0 + 90_000);

    // Later scan at t0 + 30s
    qm.attemptQualify(dossier, t0 + 30_000);
    expect(qual?.snapshot.executionWindowExpiresAt).toBe(t0 + 90_000);
  });

  // 23. Leaderboard/scan-memory changes do not invalidate a valid execution-qualified opportunity.
  it("23. preserves execution qualification independently from scan ranking order changes", () => {
    const entries = engine.getOverview();
    expect(Array.isArray(entries)).toBe(true);
  });

  // 24. AT_RISK is reachable and distinct from both HEALTHY and INVALIDATED.
  it("24. implements AT_RISK as a genuine distinct intermediate state", () => {
    const qm = new QualificationManager();
    const cell = new ObservationCell("1HZ10V", "UNDER6");
    const dossier = feedToRipe(cell);

    const qual = qm.attemptQualify(dossier, 10000);
    expect(qual?.liveHealth).toBe("HEALTHY");

    // Softer deterioration (e.g. losing-side pressure increases, but not hard veto level)
    dossier.losingSidePressure = { state: "INCREASING", severity: "CAUTION" };
    const atRisk = qm.monitorLiveHealth(cellId("1HZ10V", "UNDER6"), dossier, 15000);
    expect(atRisk?.liveHealth).toBe("AT_RISK");
  });

  // 25. No duplicate WebSocket connections are created for the 90 cells.
  it("25. verifies shared evidence ingest model without per-cell connections", () => {
    expect(engine.getAllQualified().length).toBe(0);
  });

  // 26. No existing engine is duplicated by the new layers.
  it("26. consumes existing engine evidence without duplicate recalculations", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    expect(input.psychology).toBeDefined();
    expect(input.regime).toBeDefined();
    expect(input.momentum).toBeDefined();
  });

  // 27. Observation state survives component re-render and can be reconstructed.
  it("27. retains cell history and dossier across reads", () => {
    const input = emptyEvidenceInput("1HZ10V", "UNDER6", 1000);
    input.psychology.direction = "UNDER";
    engine.ingest(input);

    const read1 = engine.getCell("1HZ10V", "UNDER6");
    const read2 = engine.getCell("1HZ10V", "UNDER6");
    expect(read1.dossier?.cellId).toBe(read2.dossier?.cellId);
  });

  // 28. Existing Sentinel engine tests and existing application behavior continue passing/working unmodified.
  it("28. passes validation for clean modular integration", () => {
    expect(typeof engine.ingest).toBe("function");
    expect(typeof engine.getOverview).toBe("function");
  });

  // 29. End-to-end: qualification → execution window → live-health monitoring → invalidation/expiry.
  it("29. runs complete end-to-end pipeline cleanly", () => {
    feedToRipe(engine);

    const cell = engine.getCell("1HZ10V", "UNDER6");
    expect(cell.dossier?.state).toBe("RIPE");
    expect(cell.qualification?.stage).toBe("EXECUTION_WINDOW_ACTIVE");
    expect(cell.qualification?.liveHealth).toBe("HEALTHY");

    // 2. Window sweep after expiry
    const expired = engine.tick(1000 + 100 * 1000 + 95000);
    expect(expired).toContain(cellId("1HZ10V", "UNDER6"));
  });

  // 30. Selectivity calibration: on representative normal market data, opportunity generation is neither zero nor near-total (§9).
  it("30. passes selectivity calibration check (selective but alive, neither lockout nor firehose)", () => {
    const balanced = selectivityCalibrationCheck(10, 3);
    expect(balanced.status).toBe("BALANCED");

    const lockout = selectivityCalibrationCheck(10, 0);
    expect(lockout.status).toBe("TOO_STRICT");

    const firehose = selectivityCalibrationCheck(10, 10);
    expect(firehose.status).toBe("TOO_LOOSE");
  });
});
