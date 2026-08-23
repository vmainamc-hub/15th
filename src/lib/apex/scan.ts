// APEX SENTINEL — cross-market ranking + SCAN NOW.
// SCAN NOW does NOT start analysis. The core is always analysing; this
// interrogates the latest intelligence state and answers: what is the
// strongest opportunity right now?
//
// The ranking is built in three passes so that RELATIVE measures are real:
//   1. per-candidate absolute evidence (unchanged from the original model),
//   2. RELATIVE EDGE against the rest of the current field,
//   3. SIGNAL PERSISTENCE / EDGE STABILITY from the retained scan history.
// Nothing in passes 2–3 can delete a candidate; they adjust ranking only.
import { apexCore } from "./core";
import { lookupAnalogue, fingerprint } from "./memory";
import { entryLab } from "./entry-conditions";
import { apexSimulator, engineAgreement, simulatorAdjustment } from "./simulator";
import { assessClearance } from "./clearance";
import { classifyEvidence } from "./evidence-status";
import { marketProfiles } from "./profiles";
import { computeDirection } from "../sentinel/direction";
import { composeDanger } from "../sentinel/danger";
import { computeSetup } from "../sentinel/setup";
import {
  comboLearning,
  IMMEDIATE_CONDITION,
  UNKNOWN_REGIME,
} from "../sentinel/combination-learning";
import { assessEntryClearance } from "../sentinel/entry-clearance";
import { losingSidePressure } from "../sentinel/losing-side-pressure";
import { computeEntryPoint } from "../sentinel/entry-point";
import { canonicalDigitState, contractPsychology } from "../sentinel/digit-psychology";
import {
  computePriceActionField,
  evaluateContractPriceAction,
} from "../sentinel/price-action-psychology";
import {
  computePressureField,
  PRESSURE_SUB,
  PRESSURE_WINDOW,
} from "../precision-edge-v2/pressure-engine";
import { operatorSpecialDigitAction } from "../sentinel/operator-special-digits";
import { computeConvergence } from "../sentinel/convergence";
import { operatorLearningLookup } from "../sentinel/operator-learning";
import { immediateGuidanceLookup } from "../sentinel/immediate-guidance";
import { evaluateSignalGovernance } from "../sentinel/global-veto";
import {
  DEFAULT_MIN_CONVICTION,
  evaluateSentinelSpine,
  runVetoEngine,
  type SentinelSpineReport,
} from "../sentinel/proposal";
import { buildPatternTags } from "../sentinel/pattern-tags";
import { buildEvidenceProfile } from "../sentinel/market-state-evidence";
import {
  hasValidatedEntryDigit,
  qualificationFor,
  resolveSignalState,
} from "../sentinel/signal-state";
import {
  applySurvivalToWindow,
  evaluateExecutionSurvival,
  evaluateEntryTrigger,
  survivalInfluence,
} from "../sentinel/execution-integration";
import { winningSideMomentum } from "../sentinel/winning-side-momentum";
import { computeManipulation } from "../precision-scanner/scoring";

import { computeRelativeEdges, type RelativeEdgeInput } from "../sentinel/relative-edge";
import { scanMemory, type ScanMemoryEntry } from "../sentinel/scan-memory";
import { detectRegimeChange } from "../sentinel/regime-detector";
import { fuseEvidence, type EngineEvidenceInput } from "../sentinel/evidence-fusion";
import { calibrateScore, type HistoricalOutcome } from "../sentinel/calibration";
import { evaluateVariableOrderMarkov } from "../sentinel/context-engine";
import { confirmedTrades } from "../sentinel/trade-feedback";
import { observationEngine, type MarketId, type Proposition } from "@/lib/sentinel/observation";
import type { MarketIntel, RankedOpportunity, ScanResult } from "./types";
import { PRIMARY_CONTRACTS } from "./types";

export interface ScanOptions {
  /** Extra score awarded to Under 7 / Over 2 — the operator's primary
   *  contracts. A preference window, not a hard override. */
  preferenceWindow: number;
  /** Minimum opportunity score to call something a real opportunity. */
  opportunityThreshold: number;
  /** Reject contracts above this danger level. */
  maxDanger: number;
  /** Minimum ticks required for a market to be considered. */
  minTicks: number;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  preferenceWindow: 4,
  opportunityThreshold: 70,
  maxDanger: 65,
  minTicks: 400,
};

export function globalDanger(intels: MarketIntel[]): number {
  const usable = intels.filter((i) => i.dataState === "OK" || i.dataState === "THIN");
  if (!usable.length) return 100;
  const mean = usable.reduce((a, i) => a + i.danger, 0) / usable.length;
  const hostile = usable.filter((i) => i.danger > 60).length / usable.length;
  return Math.round(Math.max(0, Math.min(100, mean * 0.7 + hostile * 100 * 0.3)));
}

/**
 * Rigorous multi-tier opportunity comparator.
 * Enforces ranking according to:
 * 1. Hard unblocked vs blocked status
 * 2. Observation exam qualification
 * 3. Primary score difference (tolerance 0.05)
 * 4. Digit psychology fulfillment ratio (proportion of psychology evidence supported)
 * 5. Edge group fulfillment & rapid rise confirmation
 * 6. Winning digits rapid expansion momentum (index & surging count)
 * 7. Minimal danger profile (combined contract + market danger — lower is strictly superior)
 * 8. Fluctuation score (calm market preference — lower is superior)
 * 9. Distribution integrity & manipulation score (cleaner distribution — lower is superior)
 * 10. Statistical composite edge
 * 11. Signal persistence across recent scans
 * 12. Deterministic key tie-breaker
 */
export function compareRankedOpportunities(a: RankedOpportunity, b: RankedOpportunity): number {
  // 1. Blocked candidates always sort last
  if (a.blocked !== b.blocked) {
    return Number(a.blocked) - Number(b.blocked);
  }

  // 2. Observation Qualified (Live Health: HEALTHY / AT_RISK) prioritised over unqualified
  const aObsQual =
    a.observationQualification &&
    (a.observationQualification.liveHealth === "HEALTHY" ||
      a.observationQualification.liveHealth === "AT_RISK");
  const bObsQual =
    b.observationQualification &&
    (b.observationQualification.liveHealth === "HEALTHY" ||
      b.observationQualification.liveHealth === "AT_RISK");
  if (aObsQual !== bObsQual) {
    return Number(bObsQual) - Number(aObsQual);
  }

  // 3. Composite Score difference (primary calibrated numeric score)
  const scoreDiff = b.score - a.score;
  if (Math.abs(scoreDiff) >= 0.05) {
    return scoreDiff;
  }

  // 4. Psychology Fulfillment Ratio (Gained / WeightTotal)
  const aPsychRatio =
    a.digitPsychology.weightTotal > 0
      ? a.digitPsychology.gained / a.digitPsychology.weightTotal
      : 0;
  const bPsychRatio =
    b.digitPsychology.weightTotal > 0
      ? b.digitPsychology.gained / b.digitPsychology.weightTotal
      : 0;
  const psychDiff = bPsychRatio - aPsychRatio;
  if (Math.abs(psychDiff) >= 0.02) {
    return psychDiff;
  }

  // 5. Edge Group Fulfillment:
  const aEdgeGroup = a.digitPsychology.positions.find((p) => p.role === "EDGE GROUP")?.support ?? 0;
  const bEdgeGroup = b.digitPsychology.positions.find((p) => p.role === "EDGE GROUP")?.support ?? 0;
  if (aEdgeGroup !== bEdgeGroup) {
    return bEdgeGroup - aEdgeGroup;
  }

  // 6. Winning Digits Rapid Expansion & Velocity:
  const aWsm = a.contract.winningSideMomentum?.index ?? 0;
  const bWsm = b.contract.winningSideMomentum?.index ?? 0;
  if (Math.abs(bWsm - aWsm) >= 1) {
    return bWsm - aWsm;
  }

  // 7. Minimal Danger Environment (Lower danger is strictly superior):
  const aTotalDanger = (a.contract.danger ?? 50) + (a.intel.danger ?? 50);
  const bTotalDanger = (b.contract.danger ?? 50) + (b.intel.danger ?? 50);
  if (Math.abs(aTotalDanger - bTotalDanger) >= 1) {
    return aTotalDanger - bTotalDanger; // Ascending: smaller danger first
  }

  // 8. Low Fluctuation & Market Calmness (Lower fluctuation is superior):
  const aFluct = a.intel.fluctuation?.score ?? 50;
  const bFluct = b.intel.fluctuation?.score ?? 50;
  if (Math.abs(aFluct - bFluct) >= 1) {
    return aFluct - bFluct; // Ascending: lower fluctuation first
  }

  // 9. Distribution Integrity & Low Manipulation (Lower manipulation is superior):
  const aManip = computeManipulation(a.digitState.pct).value;
  const bManip = computeManipulation(b.digitState.pct).value;
  if (Math.abs(aManip - bManip) >= 1) {
    return aManip - bManip; // Ascending: lower manipulation first
  }

  // 10. Statistical Composite Edge:
  const edgeDiff = b.contract.compositeEdge - a.contract.compositeEdge;
  if (Math.abs(edgeDiff) >= 0.1) {
    return edgeDiff;
  }

  // 11. Signal Persistence:
  const persistDiff = b.persistence.persistence - a.persistence.persistence;
  if (Math.abs(persistDiff) >= 1) {
    return persistDiff;
  }

  // Fallback to deterministic key
  return `${a.symbol}:${a.contract.id}`.localeCompare(`${b.symbol}:${b.contract.id}`);
}

export function rankOpportunities(
  intels: MarketIntel[],
  opts: ScanOptions = DEFAULT_SCAN_OPTIONS,
  /**
   * Only an explicit SCAN NOW writes to the rolling scan history. The live
   * table re-ranks every second and must not pollute scan-to-scan persistence.
   */
  recordHistory = false,
): { ranked: RankedOpportunity[]; rejected: ScanResult["rejected"] } {
  const ranked: RankedOpportunity[] = [];
  const rejected: ScanResult["rejected"] = [];
  // Derived once per ranking pass from the EXISTING persisted feedback store.
  const operatorLearning = operatorLearningLookup();
  // CHANNEL 1: immediate operator guidance, snapshotted once so the whole pass
  // is internally consistent. Bounded, expiring, attributed — never a veto.
  const guidance = immediateGuidanceLookup();

  for (const intel of intels) {
    if (intel.dataState === "UNAVAILABLE") {
      rejected.push({ symbol: intel.symbol, contract: "—", reason: "DATA UNAVAILABLE" });
      continue;
    }
    if (intel.dataState === "STALE") {
      rejected.push({ symbol: intel.symbol, contract: "—", reason: "DATA STALE — feed silent" });
      continue;
    }
    if (intel.ticks < opts.minTicks) {
      rejected.push({
        symbol: intel.symbol,
        contract: "—",
        reason: `DATA THIN — ${intel.ticks} ticks (< ${opts.minTicks})`,
      });
      continue;
    }
    const marketDigits = apexCore.getDeepDigits(intel.symbol);
    // ENGINE #1: REGIME / CHANGEPOINT ENGINE (Page-Hinkley & CUSUM)
    const regimeReport = detectRegimeChange(marketDigits, { symbol: intel.symbol });
    // Canonical 1,000-tick digit-frequency psychology — computed ONCE per
    // market and shared by every contract evaluated below.
    const canonicalState = canonicalDigitState(marketDigits, intel.digitIntel ?? null);
    // Live Scarcity & Pressure Engine field — computed ONCE per market
    // matching the dashboard panel (DigitPressure.tsx).
    const pressureField = computePressureField(marketDigits, PRESSURE_WINDOW, PRESSURE_SUB);
    // LOWER TIMEFRAME — 120-tick PRICE ACTION pressure field. Computed ONCE per
    // market from the SAME canonical digit stream as the 1,000-tick structural
    // psychology, so the two layers can never disagree about the underlying data,
    // only about what the data is doing.
    const priceActionField = computePriceActionField(marketDigits, canonicalState.pct);
    // ══ SENTINEL DECISION SPINE ══════════════════════════════════════════
    // 1,000-tick STRUCTURE decides direction · 15/30/60/120 PRESSURE judges it
    // · the VETO ENGINE grants or refuses permission. Structure, pressure and
    // validation are market-level facts, so they are computed ONCE here; the
    // per-contract view below only adds alignment and the operator gate.
    const marketSpine = evaluateSentinelSpine({
      canonical: canonicalState,
      digits: marketDigits,
    });
    for (const c of intel.contracts) {
      // ── Safety is assessed SEPARATELY from direction ──────────────────
      // Nothing below deletes a candidate. A blocked candidate stays in the
      // ranking, labelled BLOCKED with its reasons, so a genuine opportunity
      // is never silently lost and a weak one is never silently promoted.
      const sim = simulatorAdjustment(intel.symbol, c.id, c.theoretical);
      const recentPerf = apexSimulator.recentPerformance(intel.symbol, c.id, c.theoretical);
      const clearance = assessClearance({
        intel,
        contract: c,
        recent: recentPerf,
        lifetime: sim.perf,
        maxDanger: opts.maxDanger,
        maxLosingThreat: 82,
      });
      const entryRec = entryLab.recommend(intel.symbol, c.id, c.theoretical);
      const evidence = classifyEvidence({
        lifetime: sim.perf,
        recent: recentPerf,
        theoretical: c.theoretical,
        clearance,
        entry: entryRec,
      });

      // ══ SENTINEL STAGED VERDICT ══════════════════════════════════════
      // Stage 0: the decision spine for THIS contract — structure owns the
      // direction, so a contract fighting it can never be a direction candidate.
      const contractAligned = marketSpine.direction ? marketSpine.direction === c.side : null;
      const spine: SentinelSpineReport = {
        ...marketSpine,
        contractAligned,
        tradeable: marketSpine.tradeable && contractAligned !== false,
        lines:
          contractAligned === false
            ? [
                ...marketSpine.lines,
                `Contract ${c.label} is ${c.side} while structure says ${marketSpine.direction} — do not take it on this structure.`,
              ]
            : marketSpine.lines,
      };
      // Stage 1: which way does the measured evidence point?
      const direction = computeDirection(intel, c, spine);
      // Stage 2a: what is dangerous right now, component by component?
      const dangerComposition = composeDanger({
        intel,
        contract: c,
        lifetime: sim.perf,
        recent: recentPerf,
      });
      // Stage 2: belief discounted by danger and by evidence maturity.
      const setup = computeSetup({
        intel,
        contract: c,
        lifetime: sim.perf,
        recent: recentPerf,
        direction,
        danger: dangerComposition,
      });
      // Stage 3.5: has THIS market × contract × regime × entry condition
      // ever actually worked? Never pooled across any of those dimensions.
      const activeCondition =
        entryRec.best?.rule ?? (entryRec.activeNow ? entryRec.currentTrigger : IMMEDIATE_CONDITION);
      const combination = comboLearning.lookup({
        symbol: intel.symbol,
        contract: c.id,
        regime: intel.regime?.label ?? UNKNOWN_REGIME,
        entryCondition: activeCondition || IMMEDIATE_CONDITION,
      });
      // Stage 3: the CLEARED / WAIT / BLOCKED verdict.
      // Losing-side pressure was previously only a soft score dampener
      // (see applyLosingSidePressure in apex/contracts.ts) — it is now ALSO
      // a hard clearance gate, so a HOSTILE / rising-PRESSURED losing side
      // blocks the verdict outright instead of just shaving score points.
      const lsp = losingSidePressure(c.threat, spine.validation, spine.pressure);
      const entryClearance = assessEntryClearance({
        setup,
        danger: dangerComposition,
        combo: combination,
        triggerActive: entryRec.activeNow,
        losingSidePressure: lsp,
        // REFINEMENT 4 — thresholds resolved per contract family. The families
        // currently carry the existing global defaults, so behaviour is
        // unchanged; they exist so each family can be tuned independently.
        ...qualificationFor(c.id),
        // A brand-new combination may still be surfaced as an exploratory
        // candidate; it just cannot be reported as CLEARED evidence-backed.
        allowUntested: false,
      });
      // Stage 3.75: DYNAMIC ENTRY POINT — which observed digit should the bot
      // enter on for THIS market and THIS contract? Discovered, never hardcoded.
      const digitPsychology = contractPsychology(
        canonicalState,
        { label: c.label, side: c.side, barrier: c.barrier, winners: c.winners },
        pressureField,
      );

      // Stage 3.76: LOWER-TIMEFRAME PRESSURE ALIGNMENT. Does what is happening
      // over the last 120 ticks confirm, contradict, or take over from what the
      // 1,000-tick structure has built? Bounded evidence; only a CONFIRMED
      // losing-side takeover can veto.
      const priceAction = evaluateContractPriceAction({
        field: priceActionField,
        shape: { label: c.label, side: c.side, barrier: c.barrier, winners: c.winners },
        structural: canonicalState,
      });

      if (priceAction.veto) {
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason: `PRICE ACTION VETO — ${priceAction.vetoReason}`,
        });
      }

      if (digitPsychology.hardBlock) {
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason: `DIGIT PSYCHOLOGY BLOCK — ${digitPsychology.hardBlockReason}`,
        });
      }

      // ══ 90-CELL CONTINUOUS OBSERVATION LAYER GATE ═══════════════════
      // The Observation Layer conducts the stateful exam across all 90 cells.
      // A candidate must be RIPE, hard-veto-free, and quality MODERATE+ to qualify.
      const obs = observationEngine.getCell(intel.symbol as MarketId, c.id as Proposition);
      const dossier = obs?.dossier ?? null;
      const qualification = obs?.qualification ?? null;
      const isObsQualified = Boolean(
        qualification &&
        (qualification.liveHealth === "HEALTHY" || qualification.liveHealth === "AT_RISK") &&
        dossier?.state === "RIPE",
      );

      if (!isObsQualified) {
        const obsReason = dossier
          ? dossier.state !== "RIPE"
            ? `OBSERVATION ${dossier.state} — Candidate has not matured to RIPE`
            : `OBSERVATION ${qualification?.liveHealth ?? "UNQUALIFIED"} — ${qualification?.liveHealthReason ?? "Failed selectivity or hard veto"}`
          : "OBSERVATION PENDING — Cell not yet observed";
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason: obsReason,
        });
      }

      // ENGINE #4: Variable-Order Markov / Context Engine
      const losers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !c.winners.includes(d));
      const losingStrengtheningDigits = losers.filter(
        (d) =>
          d === canonicalState.mostIncreasing ||
          d === canonicalState.red ||
          d === canonicalState.secondRed ||
          d === canonicalState.secondGreen ||
          (pressureField.digits[d]?.momentum ?? 0) > 0.018 ||
          (pressureField.digits[d]?.accel ?? 0) > 0.025,
      );

      const contextMarkov = evaluateVariableOrderMarkov(marketDigits, c.winners, c.theoretical, {
        symbol: intel.symbol,
        contractLabel: c.label,
        losingStrengtheningDigits,
      });

      const entryPoint = computeEntryPoint({
        intel,
        contract: c,
        digits: marketDigits,
        danger: dangerComposition,
        entry: entryRec,
        clearanceBlocked: clearance.state === "BLOCKED",
        // Additive, bounded, market/contract-isolated operator learning.
        operator: operatorLearning,
        // CHANNEL 1 — bounded, expiring immediate operator guidance per entry digit.
        guidance,
        // Bounded, positional 1,000-tick digit psychology for this contract.
        canonicalPsychology: { state: canonicalState, contract: digitPsychology },
        // ENGINE #4 Context / Markov
        contextMarkov,
        // ENGINE #1 Regime
        regimeReport,
      });

      // Stage 3.9: LEVEL-2 EXECUTION SURVIVAL — after the entry digit prints
      // and the external bot runs, how has THIS market × contract × entry digit
      // historically behaved across the following runs? Level 1 (contract
      // resolution) is untouched; this is a separate evidence dimension.
      const survival = evaluateExecutionSurvival({
        symbol: intel.symbol,
        contract: c.id,
        contractLabel: c.label,
        digits: apexCore.getDeepDigits(intel.symbol),
        winners: c.winners,
        entryDigit: hasValidatedEntryDigit(entryPoint) ? entryPoint.preferred!.digit : null,
      });
      const survivalInf = survivalInfluence(survival);
      // Stage 3.95: LEVEL-2.5 ENTRY TRIGGER INTELLIGENCE — the operator does not
      // trade every print of the entry digit. Does the FIRST print after an
      // absence behave differently from the repeat prints inside a cluster?
      // Isolated to market × contract × entry digit × touch class.
      const entryTrigger = evaluateEntryTrigger({
        symbol: intel.symbol,
        contract: c.id,
        contractLabel: c.label,
        digits: apexCore.getDeepDigits(intel.symbol),
        winners: c.winners,
        entryDigit: hasValidatedEntryDigit(entryPoint) ? entryPoint.preferred!.digit : null,
      });
      // Operator-defined special-digit ACTION (1 in Over, 8 in Under). Bounded,
      // internal, never a blocker and deliberately not shown as a UI warning.
      const operatorSpecial = operatorSpecialDigitAction(
        c.side,
        c.winners,
        intel.digitIntel ?? null,
      );
      // §21 — the presented horizon may only SHRINK to the measured decay.
      entryPoint.window = applySurvivalToWindow(entryPoint.window, survival);

      // UNIFIED SOURCE OF TRUTH: If the Observation Layer qualified this cell,
      // the entry digit determined by the observation exam is authoritative.
      if (
        isObsQualified &&
        qualification?.snapshot.qualificationDigit !== null &&
        qualification?.snapshot.qualificationDigit !== undefined
      ) {
        const qualDigit = qualification.snapshot.qualificationDigit;
        const matchingDigit =
          entryPoint.ranking.find((r) => r.digit === qualDigit) ??
          entryPoint.all.find((r) => r.digit === qualDigit);
        if (matchingDigit) {
          entryPoint.preferred = matchingDigit;
        } else {
          entryPoint.preferred = {
            digit: qualDigit,
            score: 85,
            pWin: c.theoretical + 0.05,
            pWinLower: c.theoretical + 0.01,
            n: c.n,
            edgePp: 5.0,
            stability: 85,
            expectedWaitTicks: 10,
            sinceSeen: 5,
            isLoser: !c.winners.includes(qualDigit),
            factors: [],
            drivers: ["Observation Layer 90-Cell Qualified Entry Digit"],
            cautions: [],
          };
        }
        entryPoint.activeDigit = qualDigit;
        entryPoint.recommendedDigit = qualDigit;
        entryPoint.status = "ENTER NOW";
        const remainingSec = Math.max(
          0,
          Math.round((qualification.snapshot.executionWindowExpiresAt - Date.now()) / 1000),
        );
        entryPoint.window = {
          kind: "TICKS",
          value: remainingSec,
          label: `${remainingSec}s execution window`,
          basis: qualification.snapshot.explanation,
        };
      } else if (isObsQualified && qualification?.snapshot.qualificationDigit === null) {
        entryPoint.preferred = null;
        entryPoint.activeDigit = null;
        entryPoint.recommendedDigit = null;
        entryPoint.status = "UNVALIDATED";
      }

      if (clearance.state === "BLOCKED") {
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason: clearance.blockers.map((b) => b.text).join(" · "),
        });
      } else if (c.compositeEdge <= 0) {
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason: `No composite edge (${c.compositeEdge.toFixed(1)}) — retained as an exploratory candidate only`,
        });
      }
      const agreement = engineAgreement(c);

      const preferred = PRIMARY_CONTRACTS.includes(c.id);
      // Historical analogue from this app's own observed memory.
      const analogue = c.analogue ?? lookupAnalogue(fingerprint(intel, c));
      const analogueBonus =
        analogue && analogue.n >= 30
          ? Math.max(-6, Math.min(6, (analogue.rate - c.theoretical) * 60))
          : 0;
      // Validated models can nudge the ranking; unvalidated ones cannot.
      const modelBonus =
        c.ensemble && c.ensemble.validated > 0
          ? Math.max(-5, Math.min(5, c.ensemble.signal * 5))
          : 0;
      const agreementBonus = agreement === "SUPPORT" ? 3 : agreement === "CONFLICT" ? -8 : 0;
      // Entry-condition discovery: which way of ENTERING has actually improved
      // contract-resolved expectancy on this market/contract?
      const entry = entryRec;
      // Multi-dimensional, confidence-adjusted adjustments. Authority scales
      // with evidence maturity, so a 3-trade 100% record cannot outrank a
      // mature one — and a new candidate is not deleted for being new.
      const clearancePenalty =
        clearance.state === "BLOCKED"
          ? -45
          : clearance.state === "UNSTABLE"
            ? -12
            : clearance.state === "CAUTION"
              ? -5
              : clearance.state === "INSUFFICIENT EVIDENCE"
                ? -8
                : 2;
      const confidenceAdjustment = Math.round(((evidence.confidence - 50) / 50) * 4 * 10) / 10;
      // DOUBLE-COUNT GUARD: `sim.delta` already scores this market/contract's
      // simulator record against the contract baseline, and the recent window
      // is a SUBSET of that same ledger. Scoring it against the baseline again
      // would count the same resolutions twice, so the recent window instead
      // contributes only what the lifetime record cannot say: DRIFT — how the
      // current window differs from the candidate's own established record.
      // With no established record to drift from, it falls back to the
      // baseline comparison (no overlap exists in that case).
      const recentBaseline = sim.perf.n > recentPerf.n ? sim.perf.winRate : c.theoretical;
      const recentDelta =
        recentPerf.n >= 10
          ? Math.max(
              -8,
              Math.min(6, (recentPerf.winRate - recentBaseline) * 60 * evidence.authority),
            )
          : 0;
      const factors = [
        {
          label: "Statistical opportunity",
          points: c.opportunity,
          detail: `Composite edge ${c.compositeEdge.toFixed(1)} over ${c.n} ticks, phase ${c.phase}`,
        },
        {
          label: "Contract preference",
          points: preferred ? opts.preferenceWindow : 0,
          detail: preferred
            ? "Primary Sentinel contract (Under 7 / Over 2)"
            : "Secondary contract — no preference bonus",
        },
        {
          label: "Historical analogue",
          points: analogueBonus,
          detail:
            analogue && analogue.n >= 30
              ? `${(analogue.rate * 100).toFixed(1)}% over N=${analogue.n} matching past states`
              : "No sufficient analogue memory yet — no influence",
        },
        {
          label: "Learned model",
          points: modelBonus,
          detail: c.ensemble
            ? c.ensemble.validated > 0
              ? `${c.ensemble.validated} validated model(s), signal ${c.ensemble.signal.toFixed(2)}`
              : "Models present but not yet validated — no influence"
            : "No model output",
        },
        {
          label: "Simulator evidence",
          points: sim.delta,
          detail: sim.note,
        },
        {
          label: "Entry condition evidence",
          points: entry.rankingDelta,
          detail: entry.best
            ? `${entry.best.label} (${entry.best.state}) — ${entry.activeNow ? "trigger ACTIVE now" : "trigger not firing now"}. ${entry.best.note}`
            : entry.note,
        },
        {
          label: "Engine agreement",
          points: agreementBonus,
          detail: agreement,
        },
        {
          label: "Recent window drift (this market)",
          points: recentDelta,
          detail: recentPerf.n
            ? `Last ${Math.round(apexSimulator.getConfig().recentWindowMs / 60000)} min on ${intel.name}: ${recentPerf.n} qualifying entries, ${recentPerf.wins} wins, ${recentPerf.losses} losses, ${(recentPerf.winRate * 100).toFixed(1)}% win rate vs ${(recentBaseline * 100).toFixed(1)}% ${sim.perf.n > recentPerf.n ? "established record" : "contract baseline"} (authority ×${evidence.authority.toFixed(2)}). Counted as drift only — the same resolutions are already scored once under simulator evidence.`
            : `No qualifying entries in the last ${Math.round(apexSimulator.getConfig().recentWindowMs / 60000)} minutes on this market — no recent influence.`,
        },
        {
          label: "Danger clearance",
          points: clearancePenalty,
          detail: clearance.summary,
        },
        {
          label: "Evidence confidence",
          points: confidenceAdjustment,
          detail: `${evidence.status} · confidence ${evidence.confidence}/100 · uncertainty ${evidence.uncertainty}/100. ${evidence.note}`,
        },
      ];

      // ── Stage: LOSING-DIGIT EXPOSURE ─────────────────────────────────
      const exposure = c.exposure ?? null;
      const exposurePenalty = exposure
        ? -Math.round(
            (exposure.losingDigitExposure > 45 ? (exposure.losingDigitExposure - 45) * 0.22 : 0) *
              10,
          ) / 10
        : 0;
      factors.push({
        label: "Losing-digit exposure",
        points: exposurePenalty,
        detail: exposure
          ? exposure.summary
          : "Losing-digit exposure not computed for this candidate.",
      });

      // ── Stage: SPECIAL DIGIT RISK (0/1/8/9) ──────────────────────────
      const special = c.specialRisk ?? null;
      const specialPenalty = special
        ? -Math.round((special.exposureRisk > 50 ? (special.exposureRisk - 50) * 0.16 : 0) * 10) /
          10
        : 0;
      factors.push({
        label: "Special digit risk (0/1/8/9)",
        points: specialPenalty,
        detail: special ? special.summary : "Special digit monitor unavailable.",
      });

      // ── Stage: MARKET & CONTRACT MINIMAL DANGER ENVIRONMENT ───────────
      const maxDanger = Math.max(c.danger ?? 0, intel.danger ?? 0);
      const dangerBonus =
        maxDanger <= 22
          ? 4.0
          : maxDanger <= 32
            ? 2.0
            : maxDanger <= 45
              ? 0
              : maxDanger <= 60
                ? -4.0
                : -8.0;
      factors.push({
        label: "Minimal danger environment",
        points: dangerBonus,
        detail: `Contract danger ${(c.danger ?? 0).toFixed(0)}/100, market danger ${(intel.danger ?? 0).toFixed(0)}/100 (${
          maxDanger <= 32
            ? "low-hazard environment"
            : maxDanger <= 45
              ? "moderate risk"
              : "elevated hazard profile"
        }).`,
      });

      // ── Stage: FLUCTUATION / STABILITY OF THE EVIDENCE ───────────────
      const fluct = intel.fluctuation;
      const fluctPenalty = fluct
        ? -Math.round((fluct.score > 25 ? (fluct.score - 25) * 0.18 : -2) * 10) / 10
        : 0;
      factors.push({
        label: "Fluctuation (calm-market preference)",
        points: fluctPenalty,
        detail: fluct ? fluct.summary : "Fluctuation not yet measurable.",
      });

      // ── Stage: DISTRIBUTION INTEGRITY & MANIPULATION ─────────────────
      const manipulationScore = computeManipulation(canonicalState.pct);
      const manipPoints =
        manipulationScore.value <= 15
          ? 3.0
          : manipulationScore.value <= 25
            ? 1.0
            : manipulationScore.value <= 35
              ? -2.5
              : -6.0;
      factors.push({
        label: "Market manipulation & distribution integrity",
        points: manipPoints,
        detail: `${manipulationScore.label} (${manipulationScore.value}/100) — ${
          manipulationScore.value <= 25
            ? "clean, uncrowded digit dispersion"
            : "elevated clustering / synthetic distortion"
        }.`,
      });

      // ── Stage: DIGIT PSYCHOLOGY (hypothesis, capped influence) ───────
      const psy = intel.psychology;
      const pattern = psy ? (c.side === "OVER" ? psy.over : psy.under) : null;
      const psyPoints = pattern
        ? Math.round(
            Math.max(
              -4,
              Math.min(4, ((pattern.score - 55) / 45) * 4 * (pattern.confidence / 100)),
            ) * 10,
          ) / 10
        : 0;
      factors.push({
        label: "Digit psychology configuration",
        points: psyPoints,
        detail: pattern
          ? `${pattern.side} pattern ${pattern.score}/100 (confidence ${pattern.confidence}/100). ${pattern.supporting.length} supporting, ${pattern.contradictions.length} contradicting observation(s).`
          : "Psychology engine has no reading for this market yet.",
      });

      // ── Stage: MARKET-SPECIFIC LEARNING (never inherited) ────────────
      const learned = marketProfiles.prior(intel.symbol, c.label, c.theoretical);
      factors.push({
        label: "Market-specific learning",
        points: learned.points,
        detail: learned.detail,
      });

      const invalidation = [
        `Danger rising above ${Math.min(100, Math.round(intel.danger + 12))} on this market`,
        `Losing-side pressure taking control on the ${c.label} losing digits`,
        "Sensitive digit flipping from green (winning) to red (losing) role",
        "Regime transition away from " + (intel.regime?.label ?? "the current regime"),
        entry.best
          ? `Entry condition "${entry.best.label}" ceasing to trigger, or its expectancy turning negative`
          : "No validated entry condition emerging for this contract",
        exposure && exposure.bursting.length
          ? `Losing digit(s) ${exposure.bursting.join(", ")} continuing to burst`
          : "A losing digit starting to burst (2+ prints in 10 ticks)",
        intel.fluctuation && intel.fluctuation.state !== "CALM"
          ? `Fluctuation rising above ${Math.min(100, intel.fluctuation.score + 15)}/100`
          : "Fluctuation rising — the leading contract flickering between candidates",
        c.phase === "MATURE"
          ? "Edge decaying as the mature phase completes"
          : "Composite edge falling to zero or below",
      ];

      // ── Stage 1/2/3 contributions, each fully attributed ─────────────
      // Stage 2 replaces nothing above: it adds a bounded, measured opinion
      // about the QUALITY of the setup that the raw statistics produced.
      const setupPoints = Math.round(((setup.score - 55) / 45) * 8 * 10) / 10;
      factors.push({
        label: "Stage 2 setup score",
        points: setupPoints,
        detail: setup.summary,
      });
      const comboPoints = combination.exact.rankingDelta;
      factors.push({
        label: "Combination learning (mkt × contract × regime × entry)",
        points: comboPoints,
        detail: combination.exact.note,
      });
      const verdictPoints =
        entryClearance.verdict === "CLEARED" ? 4 : entryClearance.verdict === "BLOCKED" ? -20 : -3;
      factors.push({
        label: "Stage 3 entry clearance",
        points: verdictPoints,
        detail: entryClearance.summary,
      });
      // Validated operator learning may nudge the market/contract ranking, but
      // it is bounded (±2.5) and never replaces an engine verdict.
      const operatorRankingPoints = operatorLearning.rankingAdjustment(intel.symbol, c.id);
      if (operatorRankingPoints !== 0) {
        factors.push({
          label: "Validated operator learning",
          points: operatorRankingPoints,
          detail: operatorLearning
            .forMarket(intel.symbol, c.id)
            .map((p) => p.summary)
            .join(" "),
        });
      }
      // CHANNEL 1 — immediate operator guidance for THIS market × contract.
      // Temporary and bounded (±6); it is operator intent, not statistical proof.
      const guidanceEffect = guidance.forCandidate(intel.symbol, c.id);
      const guidancePoints = guidanceEffect.active ? guidanceEffect.points : 0;
      if (guidanceEffect.active) {
        factors.push({
          label: "Immediate operator guidance",
          points: guidancePoints,
          detail: guidanceEffect.detail,
        });
      }
      const entryPointPoints = entryPoint.rankingDelta;
      factors.push({
        label: "Dynamic entry point",
        points: entryPointPoints,
        detail: entryPoint.summary,
      });

      // Canonical digit psychology — ranking contribution (hard block handled above).
      const digitPsychologyPoints = digitPsychology.rankingDelta;
      factors.push({
        label: "Digit psychology (1,000 ticks)",
        points: digitPsychologyPoints,
        detail: digitPsychology.summary,
      });

      // Psychology fulfillment ratio — additional reward when requirements are pristine
      const psychFulfillmentBonus =
        digitPsychology.verdict === "SUPPORT"
          ? Math.round(
              (digitPsychology.gained / Math.max(1, digitPsychology.weightTotal)) * 2.5 * 10,
            ) / 10
          : digitPsychology.verdict === "OPPOSE"
            ? -3.0
            : 0;
      if (psychFulfillmentBonus !== 0) {
        factors.push({
          label: "Psychology rules fulfillment ratio",
          points: psychFulfillmentBonus,
          detail: `Psychology score ${digitPsychology.score}/100 with ${
            digitPsychology.positions.filter((p) => p.support > 0).length
          }/${digitPsychology.positions.length} required conditions confirmed.`,
        });
      }

      // ── Stage: WINNING DIGITS RAPID EXPANSION ─────────────────────────
      const wsm = c.winningSideMomentum ?? winningSideMomentum(intel.digitIntel, c.winners);
      const wsmBonus =
        wsm.state === "SURGING"
          ? 4.5
          : wsm.state === "BUILDING"
            ? 2.5
            : wsm.risingCount >= Math.ceil(c.winners.length / 2)
              ? 1.5
              : 0;
      if (wsmBonus > 0) {
        factors.push({
          label: "Winning digits rapid expansion & momentum",
          points: wsmBonus,
          detail: `${wsm.state} (${wsm.risingCount}/${c.winners.length} winning digits gaining). ${wsm.reason}`,
        });
      }

      // Lower-timeframe (120-tick) price action pressure — bounded contribution.
      const priceActionPoints = priceAction.rankingDelta;
      factors.push({
        label: `Price action pressure (${priceAction.window} ticks)`,
        points: priceActionPoints,
        detail: [priceAction.summary, ...priceAction.cautions, ...priceAction.reasons]
          .filter(Boolean)
          .join(" · "),
      });

      // Operator special-digit action — bounded penalty only, no UI warning.
      const operatorSpecialPoints = operatorSpecial.rankingDelta;
      factors.push({
        label: `Operator special-digit action (digit ${operatorSpecial.digit})`,
        points: operatorSpecialPoints,
        detail: operatorSpecial.summary,
      });

      // MODEL CONVERGENCE — explanatory cross-dimension agreement (±2).
      const convergence = computeConvergence({
        distributionChange: canonicalState.change,
        psychologyVerdict: digitPsychology.verdict,
        priceActionAgrees: direction.confidence < 20 ? null : direction.label !== "AGAINST",
        entryValidated: hasValidatedEntryDigit(entryPoint),
        stability: intel.fluctuation ? Math.max(0, 100 - intel.fluctuation.score) : null,
        survivalAligned:
          survival && survival.sufficient
            ? survival.postEntryWinRate >= survival.theoretical &&
              survival.deteriorationPoint === null
            : null,
      });
      factors.push({
        label: "Model convergence",
        points: convergence.rankingDelta,
        detail: convergence.summary,
      });

      invalidation.push(
        entryClearance.verdict === "CLEARED"
          ? `Any Stage 3 requirement failing — currently all ${entryClearance.requirements.length} are met`
          : `Stage 3 requirement(s) still unmet: ${entryClearance.unmet.map((u) => u.label).join(", ")}`,
        combination.exact.n
          ? `Combination ${combination.exact.entryCondition} in regime ${combination.exact.regime} drifting below break-even (weighted expectancy ${combination.exact.weightedExpectancy.toFixed(3)})`
          : `This exact combination (regime ${combination.exact.regime} · entry ${combination.exact.entryCondition}) remaining UNTESTED`,
        entryPoint.preferred
          ? `Entry digit ${entryPoint.preferred.digit} losing its measured conditional support`
          : "No entry digit reaching validated support on this market × contract",
      );

      // LEVEL-2 evidence is attributed like every other contribution, and it is
      // bounded: it can shade a ranking, never decide one on its own.
      factors.push({
        label: "Execution survival (Level 2, post-entry)",
        points: survivalInf.points,
        detail: survivalInf.detail,
      });
      invalidation.push(
        survival && survival.sufficient
          ? survival.deteriorationPoint
            ? `Post-entry behaviour deteriorating earlier than the observed run ${survival.deteriorationPoint}`
            : `Post-entry win rate (${(survival.postEntryWinRate * 100).toFixed(0)}%) falling back to the theoretical ${(survival.theoretical * 100).toFixed(0)}%`
          : "Execution survival remaining INSUFFICIENT — multi-run behaviour is still unmeasured here",
      );

      // LEVEL 2.5 — trigger selection. Bounded (±4) and attributed like every
      // other contribution. Unknown behaviour is neither rewarded nor punished.
      // DECISION SPINE gate — pressure that REJECTS the direction cannot be
      // rewarded by trigger quality, and MIXED pressure is capped at neutral.
      const rawEntryTriggerPoints = entryTrigger?.rankingDelta ?? 0;
      const pressureVerdict = marketSpine.validation?.verdict ?? "NEUTRAL";
      const entryTriggerPoints =
        pressureVerdict === "REJECT"
          ? Math.min(0, rawEntryTriggerPoints)
          : pressureVerdict === "MIXED"
            ? Math.min(rawEntryTriggerPoints, 0)
            : rawEntryTriggerPoints;
      factors.push({
        label: "Entry trigger intelligence (Level 2.5, first vs subsequent touch)",
        points: entryTriggerPoints,
        detail:
          entryTrigger?.summary ??
          "No validated entry digit yet, so first-versus-subsequent trigger behaviour is undefined for this candidate. Level-2.5 evidence has no influence.",
      });
      invalidation.push(
        entryTrigger
          ? entryTrigger.invalidation[0]
          : "No entry digit reaching validated support, leaving trigger selection undefined",
      );

      // ENGINE #1 — Regime Changepoint & Stability Factor (bounded ±3)
      const regimePoints =
        regimeReport.state === "STABLE"
          ? 2
          : regimeReport.state === "WATCH"
            ? 0
            : regimeReport.state === "TRANSITION"
              ? -3
              : -5;
      factors.push({
        label: "Regime & changepoint stability (Page-Hinkley)",
        points: regimePoints,
        detail: regimeReport.summary,
      });

      // ENGINE #2 — Correlation-Aware Evidence Fusion
      const fusionInputs: EngineEvidenceInput[] = [
        {
          source: "DIGIT_PSYCHOLOGY",
          label: "Digit Psychology (1,000-tick)",
          signal: digitPsychology.hardBlock
            ? -1.0
            : Math.max(-1.0, Math.min(1.0, digitPsychologyPoints / 3)),
          confidence: digitPsychology.verdict === "SUPPORT" ? 80 : 50,
          baseWeight: 1.4,
          summary: digitPsychology.summary,
        },
        {
          source: "PRESSURE",
          label: "Scarcity & Pressure",
          signal: Math.max(-1.0, Math.min(1.0, c.pressureAsymmetry)),
          confidence: intel.pressure ? 85 : 30,
          baseWeight: 1.1,
          summary: intel.pressure
            ? `Winning-side pressure asymmetry ${(c.pressureAsymmetry * 100).toFixed(0)}%`
            : "No pressure reading",
        },
        {
          source: "PRICE_ACTION",
          label: "Price Action Direction",
          signal: (direction.score - 50) / 50,
          confidence: direction.confidence,
          baseWeight: 1.0,
          summary: direction.summary,
        },
        {
          source: "TRANSITION",
          label: "Transition & Exhaustion",
          signal: Math.max(-1.0, Math.min(1.0, c.transitionSupport)),
          confidence: intel.transition?.dependency
            ? Math.round(intel.transition.dependency * 100)
            : 50,
          baseWeight: 0.9,
          summary: `Transition support ${(c.transitionSupport * 100).toFixed(0)}%`,
        },
        {
          source: "CONTEXT_MARKOV",
          label: "Variable-Order Markov Context",
          signal:
            contextMarkov.preferredDigit !== null
              ? Math.max(-1.0, Math.min(1.0, (contextMarkov.preferredPWin - c.theoretical) * 5))
              : 0,
          confidence: contextMarkov.preferredOrder
            ? contextMarkov.preferredOrder === 3
              ? 85
              : contextMarkov.preferredOrder === 2
                ? 75
                : 60
            : 30,
          baseWeight: 1.1,
          summary: contextMarkov.summary,
        },
        {
          source: "SIMULATOR_LAB",
          label: "Simulator & Entry Lab",
          signal: Math.max(-1.0, Math.min(1.0, sim.delta / 4)),
          confidence: sim.perf.n >= 30 ? 80 : 40,
          baseWeight: 0.8,
          summary: sim.note,
        },
      ];
      const evidenceFusion = fuseEvidence(fusionInputs);
      const fusionPoints = evidenceFusion.rankingDelta;
      factors.push({
        label: "Evidence fusion (correlation-discounted)",
        points: fusionPoints,
        detail: evidenceFusion.rawAgreementVsEffective,
      });

      // ENGINE #4 — Markov Context factor
      const contextPoints =
        contextMarkov.evaluations.find((e) => e.digit === entryPoint.preferred?.digit)
          ?.rankingDelta ?? (contextMarkov.preferredDigit !== null ? 1 : 0);
      factors.push({
        label: "Variable-order Markov context",
        points: contextPoints,
        detail: contextMarkov.summary,
      });

      if (entryClearance.verdict === "BLOCKED" && clearance.state !== "BLOCKED") {
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason: `STAGE 3 BLOCKED — ${entryClearance.blockers.map((b) => b.label).join(" · ")}`,
        });
      }

      // ══ LEVELS 1 & 2 — TRADER GLOBAL RISK GOVERNANCE ═════════════════
      // A pattern the operator explicitly vetoed can never be ranked as an
      // opportunity again, on ANY market, regardless of statistical score.
      // Level 2 (cross-market pattern loss memory) applies a bounded penalty.
      const patternInputs = {
        contractId: c.id,
        side: c.side,
        entryDigit: hasValidatedEntryDigit(entryPoint) ? entryPoint.preferred!.digit : null,
        regime: regimeReport.currentRegime,
        psychologyVerdict: digitPsychology.verdict,
        losingSideState: c.losingSidePressure?.state ?? null,
        alignment: priceAction.alignment,
        entryTriggerRule: entryTrigger?.preferredTouch ?? null,
      };
      const governance = evaluateSignalGovernance({
        tags: buildPatternTags(patternInputs),
        contract: c.id,
        entryDigit: patternInputs.entryDigit,
        symbol: intel.symbol,
      });
      // DECISION SPINE — the operator/learned governance verdict is fed INTO the
      // veto engine (instead of duplicating rules), and the worst of the two
      // verdicts wins.
      const spineVeto = runVetoEngine({
        structure: spine.structure,
        validation: spine.validation,
        field: spine.pressure,
        operator: {
          active: governance.vetoed,
          reason: governance.reasons[0] ?? "Trader global risk rule.",
        },
        minConviction: DEFAULT_MIN_CONVICTION,
      });
      const governedSpine: SentinelSpineReport = {
        ...spine,
        veto: spineVeto,
        tradeable: spine.tradeable && !spineVeto.blocked,
        lines: [...spine.lines.slice(0, 3), spineVeto.summary],
      };
      // "No structural direction yet" is ABSENCE of evidence, not hostility:
      // it must not blank out every score on the market. Only hostile / hard
      // gates block. No rule is relaxed — blocked candidates stay blocked, they
      // are simply ranked with a bounded penalty instead of being zeroed, so the
      // operator can still read relative opportunity quality.
      const structuralSilence = spineVeto.decisive.every(
        (h) => h.code === "STRUCTURAL_CONFLICT" || h.code === "STRUCTURAL_INSUFFICIENT",
      );
      const spineSilent = spineVeto.blocked && spineVeto.decisive.length > 0 && structuralSilence;
      const spineBlocked = (spineVeto.blocked && !spineSilent) || contractAligned === false;
      const spinePoints = spineBlocked
        ? -30
        : spineSilent
          ? -12
          : spineVeto.verdict === "CAUTION"
            ? -8
            : spine.validation?.verdict === "CONFIRM"
              ? 6
              : spine.validation?.verdict === "MIXED"
                ? -5
                : 0;
      factors.push({
        label: `Decision spine (structure → pressure → veto)`,
        points: spinePoints,
        detail: governedSpine.lines.join(" "),
      });

      if (spineBlocked) {
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason:
            contractAligned === false
              ? `AGAINST STRUCTURE — 1,000-tick structure says ${marketSpine.direction}, ${c.label} is ${c.side}.`
              : `SPINE ${spineVeto.verdict} — ${spineVeto.hits[0]?.reason ?? spineVeto.summary}`,
        });
      }
      const governancePoints = governance.vetoed ? -100 : -governance.suggestedPenalty;
      if (governance.vetoed || governancePoints !== 0) {
        factors.push({
          label: governance.vetoed
            ? "TRADER GLOBAL VETO (Level 1)"
            : "Global pattern risk (Level 2)",
          points: governancePoints,
          detail: governance.reasons.join(" "),
        });
      }
      if (governance.vetoed) {
        rejected.push({
          symbol: intel.symbol,
          contract: c.label,
          reason: governance.reasons[0] ?? "VETOED — trader global risk rule.",
        });
      }

      // ══ MARKET-STATE EVIDENCE — interpretation of the resolved sequence ══
      // A run of wins/losses is never treated as a forecast: the resolved
      // outcome history is read as evidence about the CURRENT market state.
      const stateEvidence = buildEvidenceProfile(sim.perf?.recentResults ?? []);
      factors.push({
        label: `Market-state evidence (${stateEvidence.regime})`,
        points: 0,
        detail: stateEvidence.summary,
      });

      const obsPoints = isObsQualified
        ? 15
        : dossier?.state === "CONFIRMING"
          ? 5
          : dossier?.state === "DEVELOPING"
            ? 2
            : -10;
      if (dossier) {
        factors.push({
          label: `90-cell observation exam (${dossier.state})`,
          points: obsPoints,
          detail: isObsQualified
            ? `QUALIFIED — ${qualification?.snapshot.explanation ?? "All observation exam requirements satisfied."}`
            : `Cell state ${dossier.state}. Contradictions: ${dossier.contradictions}, Stability: ${dossier.stability}/100.`,
        });
      }

      const score =
        spinePoints +
        governancePoints +
        c.opportunity +
        (preferred ? opts.preferenceWindow : 0) +
        analogueBonus +
        modelBonus +
        sim.delta +
        entry.rankingDelta +
        agreementBonus +
        recentDelta +
        clearancePenalty +
        confidenceAdjustment +
        exposurePenalty +
        specialPenalty +
        fluctPenalty +
        dangerBonus +
        wsmBonus +
        manipPoints +
        psychFulfillmentBonus +
        psyPoints +
        learned.points +
        setupPoints +
        comboPoints +
        verdictPoints +
        entryPointPoints +
        operatorRankingPoints +
        digitPsychologyPoints +
        priceActionPoints +
        operatorSpecialPoints +
        convergence.rankingDelta +
        survivalInf.points +
        guidancePoints +
        entryTriggerPoints +
        regimePoints +
        fusionPoints +
        contextPoints +
        obsPoints;

      const rawScoreClamped = Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
      const pastTrades: HistoricalOutcome[] = confirmedTrades().map((t) => ({
        score: t.snapshot.score,
        win: t.outcome === "WIN",
        market: t.snapshot.symbol,
        contract: t.snapshot.contract,
        at: t.resolvedAt ?? t.ts,
      }));
      const calibration = calibrateScore(rawScoreClamped, pastTrades, {
        symbol: intel.symbol,
        contract: c.label,
        regime: regimeReport.currentRegime,
        theoreticalBaseline: c.theoretical,
      });

      ranked.push({
        rank: 0,
        symbol: intel.symbol,
        name: intel.name,
        contract: c,
        intel,
        score: rawScoreClamped,
        preferred,
        simulator: sim.perf,
        simNote: sim.note,
        recent: recentPerf,
        entry,
        agreement,
        clearance,
        evidence,
        blocked:
          !isObsQualified ||
          governance.vetoed ||
          spineBlocked ||
          clearance.state === "BLOCKED" ||
          entryClearance.verdict === "BLOCKED" ||
          digitPsychology.hardBlock ||
          priceAction.veto,
        governance,
        spine: governedSpine,
        stateEvidence,
        observationDossier: dossier,
        observationQualification: qualification ?? null,
        factors,
        invalidation,
        direction,
        dangerComposition,
        setup,
        entryClearance,
        combination,
        entryPoint,
        survival,
        survivalInfluence: survivalInf,
        entryTrigger,
        digitPsychology,
        digitState: canonicalState,
        priceAction,
        priceActionField,
        operatorSpecial,
        convergence,
        regimeReport,
        evidenceFusion,
        calibration,
        contextMarkov,
        // REFINEMENT 1/2 — filled in once relative edge is known (pass 4).
        signal: resolveSignalState({
          entryPoint,
          verdict: entryClearance.verdict,
          grade: setup.grade,
          relative: "LEVEL",
          blocked:
            !isObsQualified ||
            governance.vetoed ||
            spineBlocked ||
            clearance.state === "BLOCKED" ||
            entryClearance.verdict === "BLOCKED" ||
            digitPsychology.hardBlock ||
            priceAction.veto,
          survival,
          entryTrigger,
        }),

        // Passes 2 and 3 fill these in once the whole field is known.
        relative: {
          key: `${intel.symbol}:${c.id}`,
          absoluteEdge: c.compositeEdge,
          riskAdjustedEdge: c.compositeEdge,
          relativeEdge: 0,
          relativeWithinMarket: 0,
          normalized: 0,
          fieldRank: 0,
          fieldSize: 0,
          label: "LEVEL",
          rankingDelta: 0,
          detail: "Relative edge not yet computed for this field.",
        },
        persistence: {
          key: `${intel.symbol}:${c.id}`,
          persistence: 0,
          currentRank: 0,
          previousRank: null,
          averageRank: 0,
          topThree: 0,
          scans: 0,
          edgeStability: 50,
          edgeSeries: [],
          edgeRange: 0,
          edgeStdDev: 0,
          rotation: "LOW",
          rotationChanges: 0,
          changeClass: "NEW",
          changeReasons: [],
          rankingDelta: 0,
          summary: "Persistence not yet computed.",
        },
      });
    }
  }

  // ══ PASS 2 — RELATIVE EDGE ═══════════════════════════════════════════
  // Every candidate is now measured against the rest of the field. Danger is
  // priced into the comparison instead of vetoing it, so the calmest market is
  // not automatically preferred over a materially stronger edge.
  const relInputs: RelativeEdgeInput[] = ranked.map((r) => ({
    key: `${r.symbol}:${r.contract.id}`,
    symbol: r.symbol,
    contract: r.contract.label,
    absoluteEdge: r.contract.compositeEdge,
    danger: r.contract.danger,
  }));
  const relatives = computeRelativeEdges(relInputs);
  for (const r of ranked) {
    const rel = relatives.get(`${r.symbol}:${r.contract.id}`);
    if (!rel) continue;
    r.relative = rel;
    r.factors.push({
      label: "Relative edge vs alternatives",
      points: rel.rankingDelta,
      detail: rel.detail,
    });
    r.score = Math.round(Math.max(0, Math.min(100, r.score + rel.rankingDelta)) * 10) / 10;
    r.invalidation.push(
      rel.relativeEdge > 0
        ? `Relative edge (${rel.relativeEdge >= 0 ? "+" : ""}${rel.relativeEdge.toFixed(2)}, ${rel.label}) collapsing as another candidate improves`
        : `This candidate remaining behind the field leader by ${Math.abs(rel.relativeEdge).toFixed(2)} risk-adjusted edge`,
    );
  }

  // Provisional ranking — required before persistence can be assessed, since
  // persistence is measured on RANK across scans.
  ranked.sort(compareRankedOpportunities);
  ranked.forEach((r, i) => (r.rank = i + 1));

  // ══ PASS 3 — SIGNAL PERSISTENCE / EDGE STABILITY ══════════════════════
  const snapshot: ScanMemoryEntry[] = [];
  for (const r of ranked) {
    const entryRow: ScanMemoryEntry = {
      key: `${r.symbol}:${r.contract.id}`,
      symbol: r.symbol,
      name: r.name,
      contract: r.contract.id,
      contractLabel: r.contract.label,
      rank: r.rank,
      score: r.score,
      absoluteEdge: r.contract.compositeEdge,
      relativeEdge: r.relative.relativeEdge,
      danger: r.contract.danger,
      agreement: r.agreement,
      evidenceConfidence: r.evidence.confidence,
      regime: r.intel.regime?.label ?? UNKNOWN_REGIME,
      verdict: r.entryClearance.verdict,
      entryDigit: r.entryPoint.preferred?.digit ?? null,
      entryCondition: r.entry?.best?.rule ?? null,
    };
    snapshot.push(entryRow);
    const assessment = scanMemory.assess(entryRow);
    r.persistence = assessment;
    r.factors.push({
      label: "Signal persistence & edge stability",
      points: assessment.rankingDelta,
      detail: assessment.summary,
    });
    r.score = Math.round(Math.max(0, Math.min(100, r.score + assessment.rankingDelta)) * 10) / 10;
  }

  // Final ordering. Blocked candidates are ordered last but never deleted: the
  // operator can always see WHY an otherwise attractive setup is unavailable.
  ranked.sort(compareRankedOpportunities);
  ranked.forEach((r, i) => (r.rank = i + 1));

  // ══ PASS 4 — UNIFIED SIGNAL STATE (translation only) ══════════════════
  // Nothing is recomputed here: the existing engine states are normalised into
  // the single STRONG / VALID / WATCH / EXPLORATORY / BLOCKED vocabulary, plus
  // the explicit "VALID — WAIT FOR ENTRY" sub-state.
  const pastTradesFinal = confirmedTrades().map((t) => ({
    score: t.snapshot.score,
    win: t.outcome === "WIN",
    market: t.snapshot.symbol,
    contract: t.snapshot.contract,
    at: t.resolvedAt ?? t.ts,
  }));
  for (const r of ranked) {
    r.signal = resolveSignalState({
      entryPoint: r.entryPoint,
      verdict: r.entryClearance.verdict,
      grade: r.setup.grade,
      relative: r.relative.label,
      blocked: r.blocked,
      survival: r.survival,
      entryTrigger: r.entryTrigger,
    });
    r.calibration = calibrateScore(r.score, pastTradesFinal, {
      symbol: r.symbol,
      contract: r.contract.label,
      regime: r.regimeReport?.currentRegime,
      theoreticalBaseline: r.contract.theoretical,
    });
  }

  if (recordHistory) {
    // Ranks may have shifted after the persistence adjustment — the history
    // stores the FINAL ranks so the next scan compares like with like.
    scanMemory.record(
      snapshot.map((s) => ({
        ...s,
        rank: ranked.find((r) => `${r.symbol}:${r.contract.id}` === s.key)?.rank ?? s.rank,
        score: ranked.find((r) => `${r.symbol}:${r.contract.id}` === s.key)?.score ?? s.score,
      })),
    );
  }

  return { ranked, rejected };
}

export function scanNow(
  intels: MarketIntel[],
  opts: ScanOptions = DEFAULT_SCAN_OPTIONS,
): ScanResult {
  const online = intels.filter((i) => i.dataState === "OK");
  const { ranked, rejected } = rankOpportunities(intels, opts, true);
  const gd = globalDanger(intels);
  // The operator always gets the highest-ranking candidate across all 90 cells,
  // prioritizing observation-qualified & unblocked setups first.
  const qualified = ranked.filter(
    (r) =>
      !r.blocked &&
      r.observationQualification &&
      (r.observationQualification.liveHealth === "HEALTHY" ||
        r.observationQualification.liveHealth === "AT_RISK"),
  );
  const unblocked = ranked.filter((r) => !r.blocked);
  const top = (qualified.length > 0 ? qualified : unblocked.length > 0 ? unblocked : ranked).slice(
    0,
    5,
  );

  let verdict: ScanResult["verdict"];
  let message: string;
  if (!online.length) {
    verdict = "DATA_UNAVAILABLE";
    message = "DATA UNAVAILABLE — no market is currently streaming enough ticks to analyse.";
  } else if (!top.length) {
    verdict = "NONE";
    message = `NO OPPORTUNITY AVAILABLE — no candidate in the 90-cell universe currently streaming.`;
  } else if (
    top[0].observationQualification &&
    (top[0].observationQualification.liveHealth === "HEALTHY" ||
      top[0].observationQualification.liveHealth === "AT_RISK") &&
    top[0].score >= opts.opportunityThreshold &&
    top[0].entryClearance.verdict === "CLEARED" &&
    (top[0].intel.fluctuation?.state ?? "CALM") !== "CHAOTIC" &&
    (top[0].contract.exposure?.state ?? "LOW") !== "SEVERE" &&
    top[0].agreement !== "STRONG CONFLICT"
  ) {
    verdict = "OPPORTUNITY";
    message = `${top[0].contract.label} on ${top[0].name} — RIPE & QUALIFIED (${top[0].observationQualification.liveHealth}). ${top[0].entryPoint.preferred ? `Entry on digit ${top[0].entryPoint.preferred.digit} (${top[0].entryPoint.status}) — ${top[0].entryPoint.window.label}.` : "Awaiting entry trigger digit."} ${top[0].observationQualification.snapshot.explanation ?? top[0].setup.summary}`;
  } else if (top[0].score >= opts.opportunityThreshold && !top[0].blocked) {
    verdict = "OPPORTUNITY";
    message = `${top[0].contract.label} on ${top[0].name} — leading candidate (Score ${top[0].score.toFixed(0)}/100, ${top[0].setup.grade}). ${top[0].entryPoint.preferred ? `Entry on digit ${top[0].entryPoint.preferred.digit} (${top[0].entryPoint.status}) — ${top[0].entryPoint.window.label}.` : "No validated entry digit yet."} ${top[0].setup.summary}`;
  } else {
    verdict = "MODERATE";
    message = `RANK #1: ${top[0].contract.label} on ${top[0].name} (Score ${top[0].score.toFixed(0)}/100, ${top[0].setup.grade}) — ${top[0].observationQualification?.snapshot.explanation ?? top[0].entryClearance.summary}`;
  }

  return {
    scannedAt: Date.now(),
    marketsOnline: online.length,
    marketsTotal: intels.length,
    evaluated: ranked.length,
    globalDanger: gd,
    globalDangerLabel: gd < 35 ? "CALM" : gd < 65 ? "ELEVATED" : "HOSTILE",
    top,
    rejected: rejected.slice(0, 40),
    verdict,
    message,
  };
}

/**
 * WHY NOT THE RUNNER-UP — a like-for-like comparison of the two best
 * candidates using only measured values. No narrative is invented: each line
 * is a real gap between two engine outputs.
 */
export function whyNotRunnerUp(top: RankedOpportunity, runner: RankedOpportunity): string[] {
  const out: string[] = [];
  const a = top.contract;
  const b = runner.contract;
  const gap = (label: string, x: number, y: number, unit = "", invert = false) => {
    const diff = x - y;
    if (Math.abs(diff) < 2) return;
    const better = invert ? diff < 0 : diff > 0;
    if (!better) return;
    out.push(
      `${label}: ${top.contract.label} ${x.toFixed(0)}${unit} vs ${runner.contract.label} ${y.toFixed(0)}${unit}.`,
    );
  };
  gap("Opportunity", top.score, runner.score);
  // ── Why #1 beat #2 on Psychology, Winning Momentum, Danger, Fluctuation, & Manipulation ──
  if (top.digitPsychology && runner.digitPsychology) {
    const topPsy = top.digitPsychology;
    const runPsy = runner.digitPsychology;
    if (Math.abs(topPsy.score - runPsy.score) >= 3 || topPsy.verdict !== runPsy.verdict) {
      out.push(
        `Digit psychology: ${top.contract.label} ${topPsy.score}/100 (${topPsy.verdict}) vs ${runner.contract.label} ${runPsy.score}/100 (${runPsy.verdict}).`,
      );
    }
  }
  const topWsm = top.contract.winningSideMomentum?.index ?? 0;
  const runWsm = runner.contract.winningSideMomentum?.index ?? 0;
  if (Math.abs(topWsm - runWsm) >= 5) {
    out.push(
      `Winning-side momentum: ${top.contract.label} ${topWsm.toFixed(0)}/100 (${top.contract.winningSideMomentum?.state ?? "FLAT"}) vs ${runner.contract.label} ${runWsm.toFixed(0)}/100 (${runner.contract.winningSideMomentum?.state ?? "FLAT"}).`,
    );
  }
  const topDanger = Math.max(top.contract.danger ?? 0, top.intel.danger ?? 0);
  const runDanger = Math.max(runner.contract.danger ?? 0, runner.intel.danger ?? 0);
  if (Math.abs(topDanger - runDanger) >= 4) {
    out.push(
      topDanger < runDanger
        ? `Minimal danger environment: ${top.name} is calmer (${topDanger.toFixed(0)}/100 vs ${runDanger.toFixed(0)}/100).`
        : `Runner-up has lower overall danger (${runDanger.toFixed(0)}/100 vs ${topDanger.toFixed(0)}/100) but loses on other core criteria.`,
    );
  }
  const topFluct = top.intel.fluctuation?.score ?? 50;
  const runFluct = runner.intel.fluctuation?.score ?? 50;
  if (Math.abs(topFluct - runFluct) >= 5) {
    out.push(
      topFluct < runFluct
        ? `Market fluctuation: ${top.name} is more stable (${topFluct}/100 vs ${runFluct}/100).`
        : `Runner-up has lower fluctuation (${runFluct}/100 vs ${topFluct}/100).`,
    );
  }
  const topManip = computeManipulation(top.digitState.pct).value;
  const runManip = computeManipulation(runner.digitState.pct).value;
  if (Math.abs(topManip - runManip) >= 4) {
    out.push(
      topManip < runManip
        ? `Distribution integrity: ${top.name} has cleaner digit distribution (${topManip}/100 vs ${runManip}/100 manipulation index).`
        : `Runner-up has cleaner digit distribution (${runManip}/100 vs ${topManip}/100).`,
    );
  }
  // ── Why #1 beat #2 on the relative / persistence dimensions ───────────
  if (top.relative && runner.relative) {
    out.push(
      `Relative edge: ${top.contract.label} ${top.relative.relativeEdge >= 0 ? "+" : ""}${top.relative.relativeEdge.toFixed(2)} (${top.relative.label}, risk-adjusted ${top.relative.riskAdjustedEdge.toFixed(2)}) vs ${runner.contract.label} ${runner.relative.relativeEdge >= 0 ? "+" : ""}${runner.relative.relativeEdge.toFixed(2)} (${runner.relative.label}, risk-adjusted ${runner.relative.riskAdjustedEdge.toFixed(2)}).`,
    );
  }
  if (top.contract && runner.contract) {
    out.push(
      `Absolute edge: ${top.contract.compositeEdge.toFixed(1)} vs ${runner.contract.compositeEdge.toFixed(1)}.`,
    );
  }
  if (top.persistence && runner.persistence) {
    out.push(
      `Persistence: ${top.persistence.persistence}/100 (top-3 in ${top.persistence.topThree}/${top.persistence.scans} scans, avg rank ${top.persistence.averageRank}) vs ${runner.persistence.persistence}/100 (${runner.persistence.topThree}/${runner.persistence.scans}, avg rank ${runner.persistence.averageRank}).`,
    );
    out.push(
      `Edge stability across scans: ${top.persistence.edgeStability}/100 vs ${runner.persistence.edgeStability}/100.`,
    );
  }
  if (top.entryPoint && runner.entryPoint) {
    out.push(
      `Entry point: ${top.contract.label} — ${top.entryPoint.preferred ? `digit ${top.entryPoint.preferred.digit} (${top.entryPoint.status}, confidence ${top.entryPoint.confidence}/100)` : "no validated entry digit"}; ${runner.contract.label} — ${runner.entryPoint.preferred ? `digit ${runner.entryPoint.preferred.digit} (${runner.entryPoint.status}, confidence ${runner.entryPoint.confidence}/100)` : "no validated entry digit"}.`,
    );
  }
  gap("Quality", a.quality, b.quality);
  gap("Stability", a.stability, b.stability);
  gap("Freshness", a.freshness, b.freshness);
  gap("Danger (lower is better)", a.danger, b.danger, "", true);
  gap("Contradiction (lower is better)", a.contradiction, b.contradiction, "", true);
  if (a.threat && b.threat && Math.abs(a.threat.groupThreat - b.threat.groupThreat) >= 4) {
    out.push(
      a.threat.groupThreat < b.threat.groupThreat
        ? `Losing-side threat is lower: ${a.threat.groupThreat.toFixed(0)} (${a.threat.state}) vs ${b.threat.groupThreat.toFixed(0)} (${b.threat.state}).`
        : `Runner-up has the calmer losing side (${b.threat.groupThreat.toFixed(0)} vs ${a.threat.groupThreat.toFixed(0)}) but loses on other measures.`,
    );
  }
  if (top.simulator && runner.simulator && (top.simulator.n >= 25 || runner.simulator.n >= 25)) {
    out.push(
      `Simulator: ${top.contract.label} ${top.simulator.n ? `${(top.simulator.winRate * 100).toFixed(1)}% (N=${top.simulator.n})` : "no sample"} vs ${runner.contract.label} ${runner.simulator.n ? `${(runner.simulator.winRate * 100).toFixed(1)}% (N=${runner.simulator.n})` : "no sample"}.`,
    );
  }
  if (top.entry?.best || runner.entry?.best) {
    const fmt = (r: RankedOpportunity) =>
      r.entry?.best
        ? `${r.entry.best.label} (${r.entry.best.state}, expectancy ${(r.entry.best.expectancy * 100).toFixed(1)}% over N=${r.entry.best.n}${r.entry.activeNow ? ", trigger active" : ", trigger not firing"})`
        : "no validated entry condition";
    out.push(
      `Entry condition: ${top.contract.label} — ${fmt(top)}; ${runner.contract.label} — ${fmt(runner)}.`,
    );
  }
  if (top.agreement !== runner.agreement) {
    out.push(`Engine agreement: ${top.agreement} vs ${runner.agreement}.`);
  }
  out.push(
    `Evidence: ${top.evidence.status} at confidence ${top.evidence.confidence}/100 vs ${runner.evidence.status} at ${runner.evidence.confidence}/100.`,
  );
  if (!out.length)
    out.push("The two candidates are statistically close — the ranking gap is not material.");
  return out.slice(0, 12);
}

/**
 * WHY THIS MARKET RANKS WHERE IT DOES — a plain reading of the measured
 * dimensions behind a candidate's position. Every line is a real measurement:
 * supports, neutrals and cautions are separated instead of blended.
 */
export function whyRanksHere(r: RankedOpportunity): {
  headline: string;
  supports: string[];
  neutral: string[];
  cautions: string[];
} {
  const supports: string[] = [];
  const neutral: string[] = [];
  const cautions: string[] = [];

  const rel = r.relative;
  if (rel.relativeEdge >= 1.5)
    supports.push(
      `${rel.label} relative edge vs alternatives (${rel.relativeEdge >= 0 ? "+" : ""}${rel.relativeEdge.toFixed(2)}, field position ${rel.fieldRank}/${rel.fieldSize})`,
    );
  else if (rel.relativeEdge > -0.4)
    neutral.push(`Relative edge is level with the field (${rel.relativeEdge.toFixed(2)})`);
  else
    cautions.push(
      `Behind the field leader by ${Math.abs(rel.relativeEdge).toFixed(2)} risk-adjusted edge`,
    );

  if (r.contract.compositeEdge > 0)
    supports.push(
      `Absolute composite edge ${r.contract.compositeEdge.toFixed(1)} over ${r.contract.n} ticks`,
    );
  else cautions.push(`No positive absolute edge (${r.contract.compositeEdge.toFixed(1)})`);

  const p = r.persistence;
  if (p.scans < 2)
    neutral.push("No scan history yet — persistence and stability are not yet measurable");
  else {
    if (p.persistence >= 65)
      supports.push(
        `Top-3 in ${p.topThree}/${p.scans} recent scans (persistence ${p.persistence}/100)`,
      );
    else if (p.persistence >= 40)
      neutral.push(`Persistence ${p.persistence}/100 across ${p.scans} scans`);
    else cautions.push(`Weak persistence ${p.persistence}/100 — average rank ${p.averageRank}`);
    if (p.edgeStability >= 70)
      supports.push(`Edge held a narrow range across scans (stability ${p.edgeStability}/100)`);
    else if (p.edgeStability < 45)
      cautions.push(
        `Edge swung across scans (stability ${p.edgeStability}/100, σ ${p.edgeStdDev})`,
      );
  }
  if (p.rotation === "HIGH")
    cautions.push("Market rotation is HIGH — the field leader keeps changing");

  const d = r.dangerComposition;
  if (d.total < 45) supports.push(`Danger remains acceptable (${d.total}/100, ${d.level})`);
  else if (d.total < 65)
    neutral.push(`Danger is elevated but priced in (${d.total}/100, ${d.level})`);
  else cautions.push(`Danger is high (${d.total}/100, ${d.level})`);

  if (r.agreement === "SUPPORT") supports.push("Engines agree on the direction");
  else if (r.agreement === "NEUTRAL") neutral.push("Engine agreement is neutral");
  else cautions.push(`Engine agreement is ${r.agreement}`);

  if (r.evidence.confidence >= 60)
    supports.push(`Evidence ${r.evidence.status} at confidence ${r.evidence.confidence}/100`);
  else
    cautions.push(
      `Evidence quality limited — ${r.evidence.status} at ${r.evidence.confidence}/100`,
    );

  if (r.recent && r.recent.n >= 10)
    supports.push(
      `Recent window on this market: ${(r.recent.winRate * 100).toFixed(1)}% over N=${r.recent.n}`,
    );
  else neutral.push("Recency: no qualifying entries in the recent window yet");

  if (r.simulator && r.simulator.n < 25)
    cautions.push(`Simulator sample remains limited (N=${r.simulator.n})`);

  if (r.entryPoint.status === "ENTER NOW" || r.entryPoint.status === "ARMED")
    supports.push(
      `Entry point measured: digit ${r.entryPoint.preferred?.digit} at confidence ${r.entryPoint.confidence}/100`,
    );
  else if (r.entryPoint.status === "UNVALIDATED")
    neutral.push("Entry point not yet validated by sufficient conditional evidence");
  else cautions.push("Entry point INVALIDATED by current conditions");

  return {
    headline: `WHY THIS MARKET RANKS #${r.rank} — ${r.contract.label} on ${r.name} at score ${r.score.toFixed(1)}/100`,
    supports,
    neutral,
    cautions,
  };
}
