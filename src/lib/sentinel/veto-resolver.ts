/**
 * UNIFIED VETO RESOLUTION HIERARCHY (§5)
 * =====================================
 * This is the SINGLE CANONICAL RESOLVER for all veto verdicts across Sentinel.
 * No score, quality band, or ranking modifier may ever override a BLOCKED verdict.
 *
 * Evaluation order (strict cascading hierarchy):
 * 1. LOCAL ENGINE VETO   (digit-psychology hardBlock, price-action veto, losing-side suppression, danger auto-block, etc.)
 *         ↓
 * 2. OBSERVATION VETO STATE (aggregates cell-level maturity, vetoed/rejected/unqualified states for this specific cell)
 *         ↓
 * 3. GLOBAL GOVERNANCE   (global-veto.ts rules — account/operator/cross-market pattern level)
 *         ↓
 * 4. FINAL VETO VERDICT
 */

export interface LocalVetoFlags {
  digitPsychologyHardBlock?: boolean;
  digitPsychologyReason?: string | null;
  priceActionVeto?: boolean;
  priceActionReason?: string | null;
  losingSideSuppressed?: boolean;
  losingSideReason?: string | null;
  spineVeto?: boolean;
  spineVetoReason?: string | null;
  dangerHardBlocked?: boolean;
  dangerReason?: string | null;
  customLocalReasons?: string[];
}

export interface ObservationVetoState {
  isVetoed?: boolean;
  isHardBlocked?: boolean;
  isUnqualified?: boolean;
  state?: string | null;
  liveHealth?: string | null;
  reason?: string | null;
}

export interface GlobalVetoRules {
  vetoed?: boolean;
  rule?: string | null;
  reason?: string | null;
  suggestedPenalty?: number;
}

export type VetoVerdict = "CLEAR" | "BLOCKED";
export type VetoSource = "LOCAL_ENGINE" | "OBSERVATION" | "GLOBAL_GOVERNANCE" | "NONE";

export interface VetoResolution {
  cellId: string;
  verdict: VetoVerdict;
  isBlocked: boolean;
  source: VetoSource;
  reason: string | null;
  details: string[];
  suggestedPenalty: number;
}

/**
 * Resolves all veto sources in strict hierarchical order:
 * 1. Local engine hard blocks (digit psychology, price action veto, losing side suppression, danger block, spine veto)
 * 2. Observation cell state (vetoed, rejected, unqualified, invalidated)
 * 3. Global governance rules (operator rules, streak caps, volatility limits)
 */
export function resolveVeto(
  cellIdOrKey: string,
  localFlags?: LocalVetoFlags | null,
  observationVetoState?: ObservationVetoState | null,
  globalRules?: GlobalVetoRules | null,
): VetoResolution {
  const details: string[] = [];

  // 1. LOCAL ENGINE VETO
  if (localFlags) {
    if (localFlags.digitPsychologyHardBlock) {
      const reason = `DIGIT PSYCHOLOGY BLOCK — ${localFlags.digitPsychologyReason || "Structural digit violation"}`;
      details.push(reason);
      return {
        cellId: cellIdOrKey,
        verdict: "BLOCKED",
        isBlocked: true,
        source: "LOCAL_ENGINE",
        reason,
        details,
        suggestedPenalty: 100,
      };
    }

    if (localFlags.priceActionVeto) {
      const reason = `PRICE ACTION VETO — ${localFlags.priceActionReason || "Lower-timeframe losing-side takeover"}`;
      details.push(reason);
      return {
        cellId: cellIdOrKey,
        verdict: "BLOCKED",
        isBlocked: true,
        source: "LOCAL_ENGINE",
        reason,
        details,
        suggestedPenalty: 100,
      };
    }

    if (localFlags.losingSideSuppressed) {
      const reason = `LOSING SIDE SUPPRESSION — ${localFlags.losingSideReason || "Losing side pressure hostile"}`;
      details.push(reason);
      return {
        cellId: cellIdOrKey,
        verdict: "BLOCKED",
        isBlocked: true,
        source: "LOCAL_ENGINE",
        reason,
        details,
        suggestedPenalty: 100,
      };
    }

    if (localFlags.spineVeto) {
      const reason = `DECISION SPINE VETO — ${localFlags.spineVetoReason || "Structure/pressure conflict"}`;
      details.push(reason);
      return {
        cellId: cellIdOrKey,
        verdict: "BLOCKED",
        isBlocked: true,
        source: "LOCAL_ENGINE",
        reason,
        details,
        suggestedPenalty: 100,
      };
    }

    if (localFlags.dangerHardBlocked) {
      const reason = `DANGER HARD BLOCK — ${localFlags.dangerReason || "Extreme danger composition component"}`;
      details.push(reason);
      return {
        cellId: cellIdOrKey,
        verdict: "BLOCKED",
        isBlocked: true,
        source: "LOCAL_ENGINE",
        reason,
        details,
        suggestedPenalty: 100,
      };
    }

    if (localFlags.customLocalReasons && localFlags.customLocalReasons.length > 0) {
      const reason = `LOCAL ENGINE VETO — ${localFlags.customLocalReasons[0]}`;
      details.push(...localFlags.customLocalReasons);
      return {
        cellId: cellIdOrKey,
        verdict: "BLOCKED",
        isBlocked: true,
        source: "LOCAL_ENGINE",
        reason,
        details,
        suggestedPenalty: 100,
      };
    }
  }

  // 2. OBSERVATION VETO STATE
  if (observationVetoState) {
    const isObsBlocked = Boolean(
      observationVetoState.isVetoed ||
      observationVetoState.isHardBlocked ||
      observationVetoState.isUnqualified ||
      observationVetoState.state === "VETOED" ||
      observationVetoState.state === "REJECTED" ||
      observationVetoState.liveHealth === "INVALIDATED",
    );

    if (isObsBlocked) {
      const reason = `OBSERVATION VETO — ${observationVetoState.reason || `Observation state: ${observationVetoState.state || "UNQUALIFIED"}`}`;
      details.push(reason);
      return {
        cellId: cellIdOrKey,
        verdict: "BLOCKED",
        isBlocked: true,
        source: "OBSERVATION",
        reason,
        details,
        suggestedPenalty: 100,
      };
    }
  }

  // 3. GLOBAL GOVERNANCE
  if (globalRules?.vetoed) {
    const reason = `GLOBAL GOVERNANCE VETO — ${globalRules.reason || globalRules.rule || "Pattern explicitly vetoed by operator"}`;
    details.push(reason);
    return {
      cellId: cellIdOrKey,
      verdict: "BLOCKED",
      isBlocked: true,
      source: "GLOBAL_GOVERNANCE",
      reason,
      details,
      suggestedPenalty: globalRules.suggestedPenalty ?? 100,
    };
  }

  // 4. CLEAR VERDICT
  return {
    cellId: cellIdOrKey,
    verdict: "CLEAR",
    isBlocked: false,
    source: "NONE",
    reason: null,
    details: [],
    suggestedPenalty: globalRules?.suggestedPenalty ?? 0,
  };
}
