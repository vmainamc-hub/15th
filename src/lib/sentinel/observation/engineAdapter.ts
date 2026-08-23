/**
 * ENGINE ADAPTER — THE INTEGRATION BOUNDARY
 * =========================================
 * This file defines the ONE shape that existing Sentinel engine output must
 * be mapped onto before it reaches the Observation Layer. Nothing downstream
 * of this file recalculates psychology, pressure, regime, momentum,
 * simulation, entry-trigger, or veto logic — it only interprets the
 * evidence handed to it (§4, §22.2).
 *
 * INTEGRATION STEPS FOR WHOEVER WIRES THIS INTO THE REPO (§22):
 *   1. Find where existing engines currently produce their per-market,
 *      per-proposition output (psychology, pressure, entry-digit, losing-
 *      side pressure, simulation, regime, momentum, trigger, veto).
 *   2. Write ONE mapping function per market tick/scan that fills in
 *      `EngineEvidenceInput` below by reading those existing outputs —
 *      do not reimplement any of the math, just translate the shape.
 *   3. Call `observationEngine.ingest(input)` with that mapped object.
 *   4. Everything else in this package (state machine, regime/momentum
 *      interpretation, selectivity, qualification, explanation) runs off
 *      of that single call.
 *
 * If a field genuinely cannot be sourced from an existing engine yet, set
 * the corresponding state to its "unknown/insufficient" value (e.g.
 * `regime.classification = 'UNKNOWN'`, `simulation.state = 'INSUFFICIENT'`)
 * rather than fabricating a value — see §5 and §9.1.
 */

import type { MarketId, Proposition } from "./constants";
import type {
  PsychologyEvidence,
  EntryDigitEvidence,
  PressureEvidence,
  LosingSidePressureEvidence,
  DangerEvidence,
  SimulationEvidence,
  RegimeEvidence,
  MomentumEvidence,
  TriggerEvidence,
  VetoEvidence,
  StatisticsEvidence,
  HiddenBehaviorEvidence,
} from "./types";
import { ALL_DIGITS } from "@/lib/sentinel/proposal/types";
import { canonicalDigitState, contractPsychology } from "@/lib/sentinel/digit-psychology";
import { composeDanger } from "@/lib/sentinel/danger";
import {
  computePressureField,
  computeGroupPressure,
} from "@/lib/sentinel/proposal/pressure-windows";
import { validateDirectionWithPressure } from "@/lib/sentinel/proposal/pressure-validator";
import { evaluateSentinelSpine } from "@/lib/sentinel/proposal";
import { losingSidePressure } from "@/lib/sentinel/losing-side-pressure";
import {
  computePriceActionField,
  evaluateContractPriceAction,
} from "@/lib/sentinel/price-action-psychology";
import { detectRegimeChange } from "@/lib/sentinel/regime-detector";
import { simulatorAdjustment, apexSimulator } from "@/lib/apex/simulator";
import { entryLab } from "@/lib/apex/entry-conditions";
import { computeEntryPoint } from "@/lib/sentinel/entry-point";
import { derivBus } from "@/lib/deriv/tick-bus";
import { operatorLearningLookup } from "@/lib/sentinel/operator-learning";
import { immediateGuidanceLookup } from "@/lib/sentinel/immediate-guidance";
import { evaluateVariableOrderMarkov } from "@/lib/sentinel/context-engine";

export interface EngineEvidenceInput {
  marketId: MarketId;
  proposition: Proposition;
  /** Tick or scan timestamp (ms epoch, or monotonic tick counter — must be strictly increasing per market). */
  timestamp: number;

  psychology: PsychologyEvidence;
  entryDigit: EntryDigitEvidence;
  pressure: PressureEvidence;
  losingSidePressure: LosingSidePressureEvidence;
  danger: DangerEvidence;
  simulation: SimulationEvidence;
  regime: RegimeEvidence;
  momentum: MomentumEvidence;
  trigger: TriggerEvidence;
  veto: VetoEvidence;
  statistics: StatisticsEvidence;
  hiddenBehavior: HiddenBehaviorEvidence;
}

/**
 * Convenience builder for integrators: fills every field with a safe
 * "insufficient/unknown" default so a partial mapping never crashes the
 * Observation Layer while the real wiring is still being built out.
 * Overwrite fields as each existing engine's output is actually mapped in.
 */
export function emptyEvidenceInput(
  marketId: MarketId,
  proposition: Proposition,
  timestamp: number,
): EngineEvidenceInput {
  return {
    marketId,
    proposition,
    timestamp,
    psychology: { direction: "NONE", state: "FORMING", support: "UNKNOWN" },
    entryDigit: { digit: null, state: "WAITING", support: "UNKNOWN", dangerousCompetitor: false },
    pressure: {
      byWindow: { 15: "UNKNOWN", 30: "UNKNOWN", 60: "UNKNOWN", 120: "UNKNOWN" },
      candidateDigitTrend: "UNKNOWN",
    },
    losingSidePressure: { state: "STABLE", severity: "NONE" },
    danger: {
      total: 0,
      level: "CALM",
      isHardBlocked: false,
      components: [],
      summary: "No active danger components — environment calm.",
    },
    simulation: { state: "INSUFFICIENT", sampleSize: 0, conditionedOnRegime: false },
    regime: {
      classification: "UNKNOWN",
      confidence: 0,
      transitioning: false,
      compatibility: "NEUTRAL_UNCERTAIN",
    },
    momentum: { side: "UNKNOWN", state: "UNKNOWN", strength: 0 },
    trigger: { state: "INVALID" },
    veto: { active: false, hard: false },
    statistics: { strength: "INSUFFICIENT", sampleSize: 0 },
    hiddenBehavior: { state: "NONE" },
  };
}

/**
 * Maps live MarketIntel from ApexCore to an array of EngineEvidenceInputs
 * (one per contract/proposition) by faithfully consuming genuine engine outputs:
 * 1,000-tick structural psychology, 15/30/60/120 pressure windows, losing-side
 * pressure, entry-digit lab, regime detector, momentum, and veto engine.
 */
export function mapIntelToObservationInputs(
  intel: any,
  rawDigits?: readonly number[],
): EngineEvidenceInput[] {
  if (!intel || !intel.symbol || !intel.contracts) return [];

  const marketId = intel.symbol as MarketId;
  const timestamp = intel.updatedAt ?? Date.now();

  const digits: readonly number[] =
    rawDigits && rawDigits.length >= 50
      ? rawDigits
      : (derivBus.getDigits(intel.symbol) as number[]) || (intel.digits as number[]) || [];

  const canonicalState = canonicalDigitState(
    digits.slice(-1000) as number[],
    intel.digitIntel ?? null,
  );
  const pressureField = computePressureField(digits.slice(-120), canonicalState.pct);
  const paField = computePriceActionField(digits.slice(-120), canonicalState.pct);
  const spineReport = evaluateSentinelSpine({
    canonical: canonicalState,
    digits: digits.slice(-120),
  });
  const regimeReport = detectRegimeChange(digits as number[], { symbol: intel.symbol });

  return intel.contracts.map((c: any): EngineEvidenceInput => {
    const prop = c.id as Proposition;
    const side = (c.side ?? (prop.startsWith("OVER") ? "OVER" : "UNDER")) as "OVER" | "UNDER";
    const isOver = side === "OVER";
    const winners: number[] =
      c.winners ??
      (isOver
        ? ALL_DIGITS.filter((d) => d > Number(prop.replace("OVER", "")))
        : ALL_DIGITS.filter((d) => d < Number(prop.replace("UNDER", ""))));
    const losers = ALL_DIGITS.filter((d) => !winners.includes(d));

    // 1. Structural Psychology (1,000-tick)
    const barrier =
      typeof c.barrier === "number"
        ? c.barrier
        : isOver
          ? Number(prop.replace("OVER", ""))
          : Number(prop.replace("UNDER", ""));
    const digitPsychology = contractPsychology(
      canonicalState,
      {
        label: c.label || `${side} ${barrier}`,
        side,
        barrier,
        winners,
      },
      pressureField,
    );
    const structure = spineReport.structure;
    const psychDirection: "OVER" | "UNDER" | "NONE" =
      structure.direction === "OVER" ? "OVER" : structure.direction === "UNDER" ? "UNDER" : "NONE";

    let psychState: PsychologyEvidence["state"] = "FORMING";
    if (structure.unusable) {
      psychState = "INVALIDATING";
    } else if (structure.change === "STRENGTHENING") {
      psychState = "STRENGTHENING";
    } else if (structure.change === "ROTATING") {
      psychState = "REVERSING";
    } else if (structure.direction === "CONFLICT") {
      psychState = "CONFLICTING";
    } else if (structure.change === "WEAKENING") {
      psychState = "WEAKENING";
    } else if (structure.change === "STABLE" && structure.conviction >= 45) {
      psychState = "COHERENT";
    } else {
      psychState = "FORMING";
    }

    let psychSupport: PsychologyEvidence["support"] = "UNKNOWN";
    if (digitPsychology.hardBlock) {
      psychSupport = "OPPOSING";
    } else if (structure.direction === side) {
      psychSupport = structure.conviction >= 30 ? "SUPPORTING" : "MIXED";
    } else if (structure.direction === "CONFLICT") {
      psychSupport = "MIXED";
    } else if (structure.direction !== "UNKNOWN") {
      psychSupport = "OPPOSING";
    } else {
      psychSupport = "UNKNOWN";
    }

    // 2. Price Action, Validation and Spine
    const validation = validateDirectionWithPressure(digits.slice(-120), side, pressureField);
    const contractSpine = evaluateSentinelSpine({
      canonical: canonicalState,
      digits: digits.slice(-120),
      contract: { label: c.label, side },
    });
    const lsp = losingSidePressure(c.threat ?? null, validation, pressureField);
    const paContract = evaluateContractPriceAction(c.label, paField, winners);

    // 3. Group Pressure across windows (15, 30, 60, 120)
    const winPressure = computeGroupPressure(
      digits.slice(-120),
      winners,
      `${c.label} winning digits`,
    );
    const losePressure = computeGroupPressure(
      digits.slice(-120),
      losers,
      `${c.label} losing digits`,
    );

    const theoreticalWinPct = (c.theoretical ?? 0.5) * 100;
    const theoreticalLosePct = 100 - theoreticalWinPct;

    const pressureByWindow: Record<
      15 | 30 | 60 | 120,
      "SUPPORTING" | "MIXED" | "OPPOSING" | "UNKNOWN"
    > = {
      15: "UNKNOWN",
      30: "UNKNOWN",
      60: "UNKNOWN",
      120: "UNKNOWN",
    };

    const windows: Array<15 | 30 | 60 | 120> = [15, 30, 60, 120];
    for (const w of windows) {
      const winSlice = winPressure.slices[w];
      const loseSlice = losePressure.slices[w];
      if (!winSlice || !loseSlice) {
        pressureByWindow[w] = "UNKNOWN";
        continue;
      }
      const winPp = winSlice.sharePct - theoreticalWinPct;
      const losePp = loseSlice.sharePct - theoreticalLosePct;

      if (winPp >= 1.5 && losePp <= -1.0) {
        pressureByWindow[w] = "SUPPORTING";
      } else if (losePp >= 1.5 && winPp <= -1.0) {
        pressureByWindow[w] = "OPPOSING";
      } else if (winSlice.sharePct > 100 - loseSlice.sharePct && winPp > 0) {
        pressureByWindow[w] = "SUPPORTING";
      } else if (loseSlice.sharePct > 100 - winSlice.sharePct && losePp > 0) {
        pressureByWindow[w] = "OPPOSING";
      } else {
        pressureByWindow[w] = "MIXED";
      }
    }

    // 4. Simulator Adjustment & Performance
    const sim = simulatorAdjustment(intel.symbol, c.id, c.theoretical);
    const recentPerf = apexSimulator.recentPerformance(intel.symbol, c.id, c.theoretical);

    // 5. Governed Entry Point Evaluation (§4.2)
    // Compose danger, entry recommendation, operator learning, guidance & Markov context
    const preliminaryDanger = composeDanger({
      intel,
      contract: {
        label: c.label,
        side,
        barrier: c.barrier,
        winners,
        losers,
      },
      lifetimeTicks: intel.ticks ?? 1000,
      recentLatencyMs: intel.latencyMs,
      losingSideHostile: lsp.state === "HOSTILE" || lsp.pressureLevel === "HOSTILE",
      losingSidePressure: lsp,
      pressure: { winPressure, losePressure, pressureField, byWindow: pressureByWindow },
      psychology: { structure, digitPsychology },
      entryPoint: null,
      simulation: { sim, recentPerf },
      regime: { regime: intel.regime, regimeReport },
      specialRisk: c.specialRisk,
      buildup: intel.buildup,
      timeframeConflict: Object.values(pressureByWindow).some((w) => w === "OPPOSING"),
    });

    const entryRec = entryLab.recommend(intel.symbol, c.id, c.theoretical);
    const operatorLearning = operatorLearningLookup(intel.symbol, c.id);
    const guidance = immediateGuidanceLookup(intel.symbol, c.id);

    const losingStrengtheningDigits = losers.filter(
      (d) =>
        d === canonicalState.mostIncreasing ||
        d === canonicalState.red ||
        d === canonicalState.secondRed ||
        d === canonicalState.secondGreen ||
        (pressureField.digits[d]?.momentum ?? 0) > 0.018 ||
        (pressureField.digits[d]?.accel ?? 0) > 0.025,
    );

    const contextMarkov = evaluateVariableOrderMarkov(
      digits as number[],
      winners,
      c.theoretical ?? (isOver ? 0.8 : 0.7),
      {
        symbol: intel.symbol,
        contractLabel: c.label,
        losingStrengtheningDigits,
      },
    );

    const clearanceBlocked = Boolean(
      preliminaryDanger.isHardBlocked ||
      digitPsychology.hardBlock ||
      lsp.verdict === "SUPPRESS" ||
      paContract.veto ||
      contractSpine.veto.verdict === "VETO",
    );

    let entryPoint: any = null;
    try {
      entryPoint = computeEntryPoint({
        intel,
        contract: c,
        digits: digits as number[],
        danger: preliminaryDanger,
        entry: entryRec,
        clearanceBlocked,
        operator: operatorLearning,
        guidance,
        canonicalPsychology: { state: canonicalState, contract: digitPsychology },
        contextMarkov,
        regimeReport,
      });
    } catch {
      entryPoint = null;
    }

    const recommendedDigit = entryPoint?.recommendedDigit ?? entryPoint?.activeDigit ?? null;
    const entryDigitState: "WAITING" | "FORMING" | "VALIDATED" = entryPoint?.validated
      ? "VALIDATED"
      : recommendedDigit !== null
        ? "FORMING"
        : "WAITING";

    let entrySupport: "SUPPORTING" | "MIXED" | "OPPOSING" | "UNKNOWN" = "UNKNOWN";
    if (recommendedDigit !== null && winners.includes(recommendedDigit)) {
      if (entryPoint?.status === "INVALIDATED") {
        entrySupport = "OPPOSING";
      } else if ((entryPoint?.confidence ?? 0) >= 50) {
        entrySupport = "SUPPORTING";
      } else {
        entrySupport = "MIXED";
      }
    } else if (recommendedDigit !== null && losers.includes(recommendedDigit)) {
      entrySupport = "OPPOSING";
    }

    const dangerousCompetitor = Boolean(
      entryPoint?.competingDigits?.some((d: any) => d.danger >= 55) ||
      (c.threat?.groupThreat ?? 0) >= 45 ||
      c.specialRisk?.extremeRisk ||
      (intel.specialDigits?.marketRisk ?? 0) >= 50,
    );

    // 5. Candidate Digit Trend
    let candidateDigitTrend: "TREND" | "FLUCTUATION" | "UNKNOWN" = "UNKNOWN";
    if (recommendedDigit !== null) {
      const reading = pressureField.digits.find((r) => r.digit === recommendedDigit);
      if (
        reading &&
        (reading.movement === "TAKING OVER" ||
          reading.movement === "ACCELERATING" ||
          reading.movement === "STRENGTHENING")
      ) {
        candidateDigitTrend = "TREND";
      } else if (
        reading &&
        (reading.direction === "REVERSING" ||
          reading.movement === "DECELERATING" ||
          reading.movement === "WEAKENING")
      ) {
        candidateDigitTrend = "FLUCTUATION";
      }
    } else if (
      winPressure.movement === "ACCELERATING" ||
      winPressure.movement === "STRENGTHENING" ||
      winPressure.movement === "TAKING OVER"
    ) {
      candidateDigitTrend = "TREND";
    } else if (
      winPressure.movement === "DECELERATING" ||
      winPressure.movement === "WEAKENING" ||
      winPressure.movement === "EXHAUSTING"
    ) {
      candidateDigitTrend = "FLUCTUATION";
    }

    // 6. Losing-Side Pressure
    let lspState: LosingSidePressureEvidence["state"] = "STABLE";
    if (lsp.state === "HOSTILE" && losePressure.movement === "TAKING OVER") {
      lspState = "TAKEOVER";
    } else if (lsp.state === "HOSTILE" || losePressure.accelerationPp > 0.8) {
      lspState = "ACCELERATING";
    } else if (lsp.state === "PRESSURED" || lsp.risingCount >= 2) {
      lspState = "INCREASING";
    } else if (lsp.state === "BUILDING") {
      lspState = "STABLE";
    } else if (lsp.state === "CALM") {
      lspState = "DECLINING";
    }

    let lspSeverity: LosingSidePressureEvidence["severity"] = "NONE";
    if (lsp.verdict === "SUPPRESS") {
      lspSeverity = "VETO";
    } else if (lsp.state === "HOSTILE") {
      lspSeverity = "REJECT";
    } else if (lsp.state === "PRESSURED") {
      lspSeverity = "DOWNGRADE";
    } else if (lsp.state === "BUILDING") {
      lspSeverity = "CAUTION";
    }

    let simState: SimulationEvidence["state"] = "STABLE";
    if (sim.perf.totalTrades < 5) {
      simState = "INSUFFICIENT";
    } else if (recentPerf.winRate >= c.theoretical + 0.04 && sim.perf.winRate >= c.theoretical) {
      simState = "FAVOURABLE";
    } else if (recentPerf.winRate >= c.theoretical && sim.perf.winRate < c.theoretical) {
      simState = "RECOVERING";
    } else if (
      recentPerf.winRate < c.theoretical - 0.08 ||
      sim.perf.winRate < c.theoretical - 0.08
    ) {
      simState = "LOSING";
    } else if (recentPerf.winRate < c.theoretical) {
      simState = "UNFAVOURABLE";
    }

    // 8. Regime Evidence
    let regimeClassification: RegimeEvidence["classification"] = "CALM_STABLE";
    if (regimeReport.isChanging || regimeReport.cusumDetected || regimeReport.phDetected) {
      regimeClassification = "TRANSITION";
    } else if (intel.regime?.label === "TRENDING") {
      regimeClassification = "TRENDING_PERSISTENT";
    } else if (intel.regime?.label === "CHOPPY") {
      regimeClassification = "CHOPPY_OSCILLATING";
    } else if (intel.regime?.label === "VOLATILE") {
      regimeClassification = "HIGH_VOLATILITY_UNSTABLE";
    } else if (intel.regime?.label === "CALM") {
      regimeClassification = "CALM_STABLE";
    }

    const regimeTransitioning = Boolean(regimeReport.isChanging || intel.regime?.transitioning);
    let regimeCompatibility: RegimeEvidence["compatibility"] = "NEUTRAL_UNCERTAIN";
    if (
      regimeReport.isChanging ||
      (intel.regime?.label === "VOLATILE" && (c.stability ?? 50) < 40)
    ) {
      regimeCompatibility = "INCOMPATIBLE";
    } else if (intel.regime?.label === "CHOPPY") {
      regimeCompatibility = "NEUTRAL_UNCERTAIN";
    } else if (
      (c.quality ?? 50) >= 50 &&
      (intel.regime?.label === "TRENDING" || intel.regime?.label === "CALM")
    ) {
      regimeCompatibility = "COMPATIBLE";
    }

    // 9. Momentum Evidence
    let momentumSide: MomentumEvidence["side"] = "BALANCED";
    if (pressureField.rising.some((d) => d >= 5) && pressureField.falling.some((d) => d <= 4)) {
      momentumSide = "OVER";
    } else if (
      pressureField.rising.some((d) => d <= 4) &&
      pressureField.falling.some((d) => d >= 5)
    ) {
      momentumSide = "UNDER";
    } else if (spineReport.pressure.direction === "OVER") {
      momentumSide = "OVER";
    } else if (spineReport.pressure.direction === "UNDER") {
      momentumSide = "UNDER";
    }

    let momentumState: MomentumEvidence["state"] = "STABLE";
    if (
      spineReport.pressure.consensus === "STRONGLY_SUPPORTING" ||
      spineReport.pressure.winningSide.movement === "ACCELERATING"
    ) {
      momentumState = "ACCELERATING";
    } else if (
      spineReport.pressure.consensus === "ROTATING" ||
      spineReport.pressure.losingSide.direction === "REVERSING"
    ) {
      momentumState = "REVERSING";
    } else if (
      spineReport.pressure.winningSide.movement === "DECELERATING" ||
      spineReport.pressure.winningSide.movement === "WEAKENING"
    ) {
      momentumState = "DECELERATING";
    } else if (spineReport.pressure.consensus === "SUPPORTING") {
      momentumState = "STABLE";
    }

    // 10. Trigger Evidence
    const entryLabRec = entryLab.recommend(intel.symbol, c.id, c.theoretical);
    let triggerState: TriggerEvidence["state"] = "INVALID";
    if (entryLabRec?.activeNow) {
      triggerState = "FIRED";
    } else if (
      entryLabRec?.best &&
      entryLabRec.best.winRate >= c.theoretical + 0.04 &&
      (c.opportunity ?? 50) >= 55 &&
      (c.danger ?? 50) < 60
    ) {
      triggerState = "VALID";
    } else if (entryLabRec?.best && (c.opportunity ?? 50) >= 40) {
      triggerState = "ARMING";
    } else if ((c.danger ?? 0) >= 75 || (c.threat?.groupThreat ?? 0) >= 70) {
      triggerState = "FAILED";
    }

    // 11. Holistic Danger Engine Composition
    const dangerComposition = composeDanger({
      intel,
      contract: {
        label: c.label,
        side,
        barrier: c.barrier,
        winners,
        losers,
      },
      lifetimeTicks: intel.ticks ?? 1000,
      recentLatencyMs: intel.latencyMs,
      losingSideHostile: lsp.state === "HOSTILE" || lsp.pressureLevel === "HOSTILE",
      losingSidePressure: lsp,
      pressure: { winPressure, losePressure, pressureField, byWindow: pressureByWindow },
      psychology: { structure, digitPsychology },
      entryPoint,
      simulation: { sim, recentPerf },
      regime: { regime: intel.regime, regimeReport },
      specialRisk: c.specialRisk,
      buildup: intel.buildup,
      timeframeConflict: Object.values(pressureByWindow).some((w) => w === "OPPOSING"),
    });

    // 12. Veto Engine
    const vetoActive = Boolean(
      contractSpine.veto.verdict === "VETO" ||
      contractSpine.veto.verdict === "SUPPRESS" ||
      lsp.verdict === "SUPPRESS" ||
      paContract.veto ||
      digitPsychology.hardBlock ||
      dangerComposition.isHardBlocked,
    );
    const vetoHard = Boolean(
      contractSpine.veto.verdict === "VETO" ||
      lsp.verdict === "SUPPRESS" ||
      paContract.veto ||
      digitPsychology.hardBlock ||
      dangerComposition.isHardBlocked,
    );
    const vetoReason =
      dangerComposition.autoBlock[0]?.detail ||
      contractSpine.veto.summary ||
      lsp.reason ||
      paContract.vetoReason ||
      digitPsychology.hardBlockReason ||
      undefined;

    return {
      marketId,
      proposition: prop,
      timestamp,
      psychology: {
        direction: psychDirection,
        state: psychState,
        support: psychSupport,
        raw: { structure, digitPsychology },
      },
      entryDigit: {
        digit: recommendedDigit,
        state: entryDigitState,
        support: entrySupport,
        dangerousCompetitor,
        raw: entryPoint,
      },
      pressure: {
        byWindow: pressureByWindow,
        candidateDigitTrend,
        raw: { winPressure, losePressure, pressureField },
      },
      losingSidePressure: {
        state: lspState,
        severity: lspSeverity,
        raw: lsp,
      },
      danger: {
        total: dangerComposition.total,
        level: dangerComposition.level,
        isHardBlocked: dangerComposition.isHardBlocked,
        components: dangerComposition.components,
        summary: dangerComposition.summary,
        raw: dangerComposition,
      },
      simulation: {
        state: simState,
        sampleSize: sim.perf.totalTrades,
        conditionedOnRegime: true,
        raw: { sim, recentPerf },
      },
      regime: {
        classification: regimeClassification,
        confidence: intel.regime?.strength ?? (regimeReport.ticksSinceChange > 50 ? 0.8 : 0.4),
        transitioning: regimeTransitioning,
        compatibility: regimeCompatibility,
        raw: { regime: intel.regime, regimeReport },
      },
      momentum: {
        side: momentumSide,
        state: momentumState,
        strength: Math.min(1, Math.max(0, Math.abs(spineReport.pressure.support) / 100)),
        raw: spineReport.pressure,
      },
      trigger: {
        state: triggerState,
        raw: { entryLabRec },
      },
      veto: {
        active: vetoActive,
        hard: vetoHard,
        reason: vetoReason,
        raw: { spineVeto: contractSpine.veto, lsp, paContract, digitPsychology, dangerComposition },
      },
      statistics: {
        strength:
          (intel.ticks ?? 0) >= 800
            ? "STRONG"
            : (intel.ticks ?? 0) >= 400
              ? "MODERATE"
              : (intel.ticks ?? 0) >= 200
                ? "WEAK"
                : "INSUFFICIENT",
        sampleSize: intel.ticks ?? 0,
        raw: intel.stats,
      },
      hiddenBehavior: {
        state: intel.buildup?.detected ? "EMERGING" : "NONE",
        description: intel.buildup?.reason,
      },
    };
  });
}
