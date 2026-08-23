import type { CellId, MarketId, Proposition } from "./constants";

// ---------------------------------------------------------------------------
// §8.1 — Observation states
// ---------------------------------------------------------------------------

export type ObservationState =
  | "WATCHING"
  | "INTERESTING"
  | "DEVELOPING"
  | "CONFIRMING"
  | "RIPE"
  | "UNSTABLE"
  | "CONFLICT"
  | "ABANDONED"
  | "DECAYING"
  | "EXPIRED"
  | "VETOED"
  | "REJECTED";

// ---------------------------------------------------------------------------
// §8.2 / §10 — Qualification & execution states
// (kept as genuinely distinct states, never synonyms — §11.4)
// ---------------------------------------------------------------------------

export type QualificationStage =
  | "CANDIDATE"
  | "STRONG_CANDIDATE"
  | "OPPORTUNITY"
  | "BEST_SETUP"
  | "EXECUTION_QUALIFIED"
  | "EXECUTION_WINDOW_ACTIVE";

export type LiveHealth = "HEALTHY" | "AT_RISK" | "INVALIDATED" | "EXPIRED";

// ---------------------------------------------------------------------------
// §7 — Evidence vocabulary. These are the *only* things the Observation Layer
// is allowed to reason over — they describe evidence already produced by
// existing Sentinel engines, never a re-derivation of it.
// ---------------------------------------------------------------------------

export type SupportLevel = "SUPPORTING" | "MIXED" | "OPPOSING" | "UNKNOWN";

export type StabilityState =
  "CALM" | "STABLE" | "DEVELOPING" | "FLUCTUATING" | "CHOPPY" | "HIGHLY_UNSTABLE" | "TRANSITIONING";

export type HiddenBehaviorState =
  "SUPPRESSED" | "EMERGING" | "ABSENT" | "UNEXPECTED" | "CONTRADICTORY" | "NONE";

export type EntryDigitState = "WAITING" | "FORMING" | "VALIDATED";

export type SimulationState =
  | "STABLE"
  | "FAVOURABLE"
  | "UNFAVOURABLE"
  | "RECOVERING"
  | "LOSING"
  | "CHOPPY"
  | "TRANSITIONING"
  | "INSUFFICIENT";

export type RegimeClassification =
  | "CALM_STABLE"
  | "TRENDING_PERSISTENT"
  | "CHOPPY_OSCILLATING"
  | "TRANSITION"
  | "ACCUMULATION"
  | "DISPLACEMENT_MANIPULATION"
  | "DISTRIBUTION_EXHAUSTION"
  | "HIGH_VOLATILITY_UNSTABLE"
  | "UNKNOWN";

export type RegimeCompatibility = "COMPATIBLE" | "NEUTRAL_UNCERTAIN" | "INCOMPATIBLE";

export type MomentumSide = "OVER" | "UNDER" | "BALANCED" | "UNKNOWN";
export type MomentumState =
  "ACCELERATING" | "STABLE" | "DECELERATING" | "REVERSING" | "BALANCED" | "UNKNOWN";
export type MomentumRelation = "SUPPORTIVE" | "NEUTRAL" | "CONFLICTING";

export type StatisticsStrength = "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT";

export type TriggerState = "INVALID" | "ARMING" | "VALID" | "FIRED" | "FAILED";

export type PressureWindow = 15 | 30 | 60 | 120;

// ---------------------------------------------------------------------------
// §4 — Evidence groups, as normalized shapes the adapter maps existing
// engine output onto. `raw` always carries the untouched original engine
// output through, so nothing is ever lost or duplicated in translation.
// ---------------------------------------------------------------------------

export interface PsychologyEvidence {
  direction: "OVER" | "UNDER" | "NONE";
  state:
    | "FORMING"
    | "STRENGTHENING"
    | "COHERENT"
    | "CONFLICTING"
    | "WEAKENING"
    | "REVERSING"
    | "INVALIDATING";
  support: SupportLevel;
  /** Existing Sentinel Green/2nd Green/Red/2nd Red/parity/edge result, untouched. */
  raw?: unknown;
}

export interface EntryDigitEvidence {
  digit: number | null;
  state: EntryDigitState;
  support: SupportLevel;
  dangerousCompetitor: boolean;
  raw?: unknown;
}

export interface PressureEvidence {
  byWindow: Record<PressureWindow, SupportLevel>;
  candidateDigitTrend: "TREND" | "FLUCTUATION" | "UNKNOWN";
  raw?: unknown;
}

export interface LosingSidePressureEvidence {
  state: "DECLINING" | "STABLE" | "INCREASING" | "ACCELERATING" | "TAKEOVER";
  severity: "NONE" | "CAUTION" | "DOWNGRADE" | "REJECT" | "VETO";
  raw?: unknown;
}

export interface SimulationEvidence {
  state: SimulationState;
  sampleSize: number;
  conditionedOnRegime: boolean;
  raw?: unknown;
}

export interface RegimeEvidence {
  classification: RegimeClassification;
  confidence: number; // 0..1, as reported by the existing regime engine
  transitioning: boolean;
  compatibility: RegimeCompatibility;
  raw?: unknown;
}

export interface MomentumEvidence {
  side: MomentumSide;
  state: MomentumState;
  strength: number; // 0..1, as reported by the existing momentum engine
  raw?: unknown;
}

export interface TriggerEvidence {
  state: TriggerState;
  raw?: unknown;
}

export interface VetoEvidence {
  active: boolean;
  reason?: string;
  hard: boolean; // hard veto (§9) vs. soft/advisory
  raw?: unknown;
}

export interface StatisticsEvidence {
  strength: StatisticsStrength;
  sampleSize: number;
  raw?: unknown;
}

export interface DangerEvidence {
  total: number;
  level: "CALM" | "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  isHardBlocked: boolean;
  components: Array<{
    code: string;
    label: string;
    severity: "MILD" | "MODERATE" | "HIGH" | "SEVERE" | "AUTO_BLOCK";
    points: number;
    value: string;
    detail: string;
    isAutoBlock: boolean;
  }>;
  summary: string;
  raw?: unknown;
}

export interface HiddenBehaviorEvidence {
  state: HiddenBehaviorState;
  description?: string;
}

export interface CellFeedbackPostMortem {
  sourceId: string;
  timestamp: number;
  outcome: "WIN" | "LOSS" | "CANCELLED" | "PENDING";
  category: string | null;
  text: string;
  executionDanger: number;
  entryDigit: number | null;
  losingSidePressureState?: string | null;
  losingSidePressureIndex?: number | null;
  regime?: string | null;
  agreement?: string | null;
  summary: string;
  actionableDirectives: string[];
}

export interface CellFeedbackLearning {
  lastOutcome: "WIN" | "LOSS" | "CANCELLED" | "PENDING" | null;
  lastOutcomeAt: number | null;
  recentLosses: number;
  recentWins: number;
  activeConcern: string | null;
  activeCategory: string | null;
  activeDirectiveType: string | null;
  postMortemAdvice: string | null;
  cautionActive: boolean;
  cautionUntil: number | null;
  history: CellFeedbackPostMortem[];
}

// ---------------------------------------------------------------------------
// §6 — The Market Thesis object
// ---------------------------------------------------------------------------

export interface MarketThesis {
  market: string;
  contract: Proposition;
  structuralDirection: "OVER" | "UNDER" | "NONE" | "UNKNOWN";
  structuralConfidence: "HIGH" | "MEDIUM" | "LOW";
  currentPressure: "SUPPORTIVE" | "CONTRADICTORY" | "MIXED" | "UNKNOWN";
  pressureAgreement: string; // e.g. "4/4"
  regime: { classification: string; suitability: "HIGH" | "MEDIUM" | "LOW" };
  simulation: { state: "SUPPORTIVE" | "UNSUPPORTIVE" | "INSUFFICIENT"; sampleSize: number };
  entryDigit: { digit: number | null; confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" };
  losingSideThreat: "LOW" | "MEDIUM" | "HIGH";
  veto: "CLEAR" | "BLOCKED";
  observationState: ObservationState;
  lastChangedField: string; // which input changed most recently, for debugging
}

// ---------------------------------------------------------------------------
// §4.1 — Observation Engine Health
// ---------------------------------------------------------------------------

export type ObservationEngineHealthState = "HEALTHY" | "DEGRADED" | "STALE" | "ERROR";

export interface ObservationEngineHealthReport {
  status: ObservationEngineHealthState;
  lastIngestTimestamp: number;
  lastSuccessfulCycle: number;
  errorCount: number;
  lastError: string | null;
  message: string;
  healthyCount: number;
  ripeCount: number;
  activeCellsCount: number;
}

// ---------------------------------------------------------------------------
// §7 — The observation dossier
// ---------------------------------------------------------------------------

export interface ObservationDossier {
  marketId: MarketId;
  proposition: Proposition;
  cellId: CellId;
  state: ObservationState;
  observationAge: number; // ticks/samples since first created
  currentStateSince: number; // ticks/samples since entering current state
  stability: StabilityState;
  psychology: PsychologyEvidence;
  entryDigit: EntryDigitEvidence;
  pressure: PressureEvidence;
  losingSidePressure: LosingSidePressureEvidence;
  danger: DangerEvidence;
  simulation: SimulationEvidence;
  regime: RegimeEvidence;
  momentum: MomentumEvidence;
  momentumRelation: MomentumRelation;
  trigger: TriggerEvidence;
  veto: VetoEvidence;
  statistics: StatisticsEvidence;
  hiddenBehavior: HiddenBehaviorEvidence;
  contradictions: number;
  supportingEvidence: string[];
  opposingEvidence: string[];
  formationVelocity: "RAPID" | "NORMAL" | "SLOW" | "DETERIORATING";
  evidenceMaturity: "LOW" | "MODERATE" | "HIGH";
  assessment: string; // short current-status phrase
  thesis?: MarketThesis;
  feedbackLearning?: CellFeedbackLearning | null;
}

export interface ObservationEvent {
  timestamp: number;
  from: ObservationState;
  to: ObservationState;
  reason: string;
}

// ---------------------------------------------------------------------------
// §10 — Immutable qualification snapshot
// ---------------------------------------------------------------------------

export interface QualificationSnapshot {
  cellId: CellId;
  marketId: MarketId;
  proposition: Proposition;
  qualifiedAt: number;
  qualificationConfidence: StatisticsStrength;
  qualificationRegime: RegimeClassification;
  qualificationRegimeConfidence: number;
  qualificationRegimeTransition: boolean;
  qualificationMomentum: MomentumRelation;
  qualificationDigit: number | null;
  qualificationStructure: PsychologyEvidence;
  qualificationPressure: PressureEvidence;
  qualificationDanger?: DangerEvidence;
  qualificationStatistics: StatisticsEvidence;
  qualificationTrigger: TriggerEvidence;
  executionWindowStartedAt: number;
  executionWindowExpiresAt: number; // fixed at qualifiedAt + 90s, never rolls forward (§10.3)
  explanation: string[]; // §12 "why RIPE", frozen at qualification time
}

export interface QualifiedOpportunity {
  snapshot: QualificationSnapshot;
  stage: "EXECUTION_QUALIFIED" | "EXECUTION_WINDOW_ACTIVE";
  liveHealth: LiveHealth;
  liveHealthReason: string;
}
