import {
  ALL_CELL_IDS,
  MARKET_IDS,
  PROPOSITIONS,
  parseCellId,
  type CellId,
  type MarketId,
  type Proposition,
} from "./constants";
import { ObservationCell } from "./observationCell";
import { RegimeTracker } from "./regimeLayer";
import { QualificationManager } from "./qualification";
import type { EngineEvidenceInput } from "./engineAdapter";
import type {
  CellFeedbackPostMortem,
  MarketThesis,
  ObservationDossier,
  ObservationEngineHealthReport,
  ObservationEvent,
  QualifiedOpportunity,
} from "./types";
import { assessQuality } from "./selectivity";
import { interpretMomentum } from "./momentumLayer";
import type { ObservationPersistenceAdapter } from "./persistence";
import { SupabasePersistenceAdapter } from "./supabasePersistence";

export interface OverviewEntry {
  dossier: ObservationDossier;
  explanation: string;
  qualification: QualifiedOpportunity | null;
  rank: number;
}

const STATE_WEIGHT: Record<string, number> = {
  RIPE: 6,
  CONFIRMING: 5,
  DEVELOPING: 4,
  INTERESTING: 3,
  UNSTABLE: 2,
  CONFLICT: 1,
  WATCHING: 0,
  DECAYING: 1,
  VETOED: -1,
  REJECTED: -1,
  ABANDONED: -2,
  EXPIRED: -2,
};

/**
 * §22 — the single integration point the rest of Sentinel talks to.
 * Owns the 90 observation cells (§2), shares one evidence stream per market
 * (§16 — no per-cell WebSocket connections), tracks regime transitions to
 * force re-evaluation of waiting opportunities (§5), and runs qualification
 * (§10) whenever a cell reaches RIPE.
 */
export class ObservationEngine {
  private cells = new Map<CellId, ObservationCell>();
  private regimeTracker = new RegimeTracker();
  readonly qualificationManager = new QualificationManager();
  private persistence: ObservationPersistenceAdapter = new SupabasePersistenceAdapter();

  // Health and telemetry metrics
  private lastIngestAt = 0;
  private lastTickAt = 0;
  private errorsCount = 0;
  private lastError: string | null = null;

  constructor() {
    for (const id of ALL_CELL_IDS) {
      const { marketId, proposition } = parseCellId(id);
      this.cells.set(id, new ObservationCell(marketId, proposition));
    }
  }

  setPersistenceAdapter(adapter: ObservationPersistenceAdapter) {
    this.persistence = adapter;
  }

  getPersistenceAdapter(): ObservationPersistenceAdapter {
    return this.persistence;
  }

  recordIngestError(err: unknown): void {
    this.errorsCount += 1;
    this.lastError = err instanceof Error ? err.message : String(err);
  }

  getHealthStatus(): ObservationEngineHealthReport {
    const totalCells = this.cells.size;
    let activeCells = 0;
    for (const cell of this.cells.values()) {
      if (cell.getDossier() !== null) activeCells += 1;
    }

    const now = Date.now();
    const staleIngest = this.lastIngestAt > 0 && now - this.lastIngestAt > 20_000;
    const isDegraded = staleIngest || (activeCells > 0 && activeCells < 15);
    const isUnhealthy =
      (this.errorsCount > 10 && now - this.lastIngestAt > 30_000) || totalCells === 0;

    let status: ObservationEngineHealthReport["status"] = "HEALTHY";
    let message = `Operating normally with ${activeCells}/${totalCells} active observation cells.`;

    if (isUnhealthy) {
      status = "UNHEALTHY";
      message = `Observation engine degraded: ${this.lastError || "Ingestion interrupted"}.`;
    } else if (isDegraded) {
      status = "DEGRADED";
      message = staleIngest
        ? `No tick updates received for ${(now - this.lastIngestAt) / 1000}s.`
        : `Partial universe coverage (${activeCells}/${totalCells} cells active).`;
    }

    return {
      totalCells,
      activeCells,
      lastIngestAt: this.lastIngestAt,
      lastTickAt: this.lastTickAt,
      errorsCount: this.errorsCount,
      lastError: this.lastError,
      status,
      message,
    };
  }

  getAllTheses(): MarketThesis[] {
    const theses: MarketThesis[] = [];
    for (const cell of this.cells.values()) {
      const dossier = cell.getDossier();
      if (dossier?.thesis) {
        theses.push(dossier.thesis);
      }
    }
    return theses;
  }

  getThesesByMarket(marketId: MarketId): MarketThesis[] {
    const theses: MarketThesis[] = [];
    for (const prop of PROPOSITIONS) {
      const id = `${marketId}:${prop}` as CellId;
      const cell = this.cells.get(id);
      const dossier = cell?.getDossier();
      if (dossier?.thesis) {
        theses.push(dossier.thesis);
      }
    }
    return theses;
  }

  /**
   * §22.9 — Ingests trade outcomes and operator feedback directly into the observation layer.
   * Analyzes what the trade looked like at the time of execution, extracts post-mortem
   * lessons, and immediately informs the corresponding observation cell and qualification manager.
   */
  ingestTradeFeedback(
    trade: {
      id: string;
      outcome: "WIN" | "LOSS" | "CANCELLED" | "PENDING";
      snapshot: {
        symbol: string;
        contract: string;
        contractLabel?: string;
        entryDigit?: number | null;
        danger: number;
        losingSidePressureState?: string | null;
        losingSidePressureIndex?: number | null;
        regime?: string | null;
        agreement?: string | null;
      };
      feedback?: {
        text: string;
        category?: string | null;
      } | null;
    },
    note?: { text: string; category?: string | null } | null,
  ): CellFeedbackPostMortem | null {
    const marketId = trade.snapshot.symbol;
    const rawContract = trade.snapshot.contract;

    // Resolve target propositions
    const matchingProps: Proposition[] = [];
    if (PROPOSITIONS.includes(rawContract as Proposition)) {
      matchingProps.push(rawContract as Proposition);
    } else {
      // Find matching proposition for this contract type (e.g. OVER vs UNDER)
      for (const p of PROPOSITIONS) {
        if (rawContract.toUpperCase().includes("OVER") && p.startsWith("OVER")) {
          matchingProps.push(p);
        } else if (rawContract.toUpperCase().includes("UNDER") && p.startsWith("UNDER")) {
          matchingProps.push(p);
        }
      }
    }

    if (matchingProps.length === 0) return null;

    const outcome = trade.outcome;
    const category = note?.category ?? trade.feedback?.category ?? null;
    const text =
      note?.text ??
      trade.feedback?.text ??
      (outcome === "LOSS" ? "Trade loss recorded by operator" : "Trade win recorded by operator");

    const actionableDirectives: string[] = [];
    if (outcome === "LOSS" || (category && category !== "STRONG SIGNAL")) {
      if (trade.snapshot.entryDigit !== undefined && trade.snapshot.entryDigit !== null) {
        actionableDirectives.push(
          `Penalize entry digit ${trade.snapshot.entryDigit} on subsequent setups`,
        );
      }
      if (
        trade.snapshot.losingSidePressureState === "INCREASING" ||
        trade.snapshot.losingSidePressureState === "ACCELERATING"
      ) {
        actionableDirectives.push("Require strictly declining losing-side pressure");
      }
      if (trade.snapshot.danger > 25) {
        actionableDirectives.push(
          `Elevate danger scrutiny (execution danger was ${trade.snapshot.danger.toFixed(0)})`,
        );
      }
      if (category) {
        actionableDirectives.push(`Operator noted concern: ${category}`);
      }
    } else {
      actionableDirectives.push("Reinforce setup parameters from confirmed positive execution");
    }

    const summary =
      outcome === "LOSS"
        ? `Loss registered on ${marketId} ${trade.snapshot.contractLabel || rawContract} (Entry digit: ${trade.snapshot.entryDigit ?? "none"}, Danger: ${trade.snapshot.danger.toFixed(0)}${trade.snapshot.losingSidePressureState ? `, Losing pressure: ${trade.snapshot.losingSidePressureState}` : ""}${category ? `, Concern: ${category}` : ""}). Immediate post-mortem caution applied.`
        : `Confirmed WIN on ${marketId} ${trade.snapshot.contractLabel || rawContract} (Entry digit: ${trade.snapshot.entryDigit ?? "none"}).`;

    const postMortem: CellFeedbackPostMortem = {
      sourceId: trade.id,
      timestamp: Date.now(),
      outcome,
      category,
      text,
      executionDanger: trade.snapshot.danger,
      entryDigit: trade.snapshot.entryDigit ?? null,
      losingSidePressureState: trade.snapshot.losingSidePressureState ?? null,
      losingSidePressureIndex: trade.snapshot.losingSidePressureIndex ?? null,
      regime: trade.snapshot.regime ?? null,
      agreement: trade.snapshot.agreement ?? null,
      summary,
      actionableDirectives,
    };

    for (const prop of matchingProps) {
      const id = `${marketId}:${prop}` as CellId;
      const cell = this.cells.get(id);
      if (cell) {
        cell.ingestFeedbackPostMortem(postMortem);
        this.qualificationManager.handleFeedback(id, postMortem);
      }
    }

    return postMortem;
  }

  clearFeedbackState(): void {
    for (const cell of this.cells.values()) {
      cell.clearFeedbackState();
    }
    this.qualificationManager.clear();
  }

  /**
   * §22.3/§22.6 — call once per mapped engine evidence update. One market
   * tick typically produces up to 6 calls (one per proposition on that
   * market) sharing the same underlying data stream.
   */
  ingest(input: EngineEvidenceInput): ObservationDossier {
    this.lastIngestAt = input.timestamp || Date.now();
    const id = `${input.marketId}:${input.proposition}` as CellId;
    const cell = this.cells.get(id);
    if (!cell) throw new Error(`Unknown observation cell: ${id}`);

    const materialRegimeShift = this.regimeTracker.update(
      input.marketId,
      input.regime,
      input.timestamp,
    );
    const dossier = cell.ingest(input);

    if (materialRegimeShift) {
      this.reEvaluateMarket(input.marketId, input.timestamp);
    }

    if (dossier.state === "RIPE") {
      const opp = this.qualificationManager.attemptQualify(dossier, input.timestamp);
      if (opp) {
        void this.persistence.saveQualification(opp.snapshot);
      }
    }
    this.qualificationManager.monitorLiveHealth(id, dossier, input.timestamp);

    // Periodically or on active states save dossier snapshot to persistence
    if (
      dossier.state === "RIPE" ||
      dossier.state === "CONFIRMING" ||
      dossier.state === "DEVELOPING"
    ) {
      void this.persistence.saveDossierSnapshot(dossier);
    }

    return dossier;
  }

  /** §5 — force live-health re-evaluation of any waiting/active opportunity on a market whose regime just shifted materially. */
  private reEvaluateMarket(marketId: MarketId, now: number) {
    for (const prop of PROPOSITIONS) {
      const id = `${marketId}:${prop}` as CellId;
      const dossier = this.cells.get(id)?.getDossier() ?? null;
      this.qualificationManager.monitorLiveHealth(id, dossier, now);
    }
  }

  /** Periodic call (e.g. every second) independent of market data, to expire windows on schedule (§10.3). */
  tick(now: number): CellId[] {
    this.lastTickAt = now;
    return this.qualificationManager.sweepExpired(now);
  }

  getCell(
    marketId: MarketId,
    proposition: (typeof PROPOSITIONS)[number],
  ): {
    dossier: ObservationDossier | null;
    events: ObservationEvent[];
    qualification: QualifiedOpportunity | undefined;
  } {
    const id = `${marketId}:${proposition}` as CellId;
    const cell = this.cells.get(id)!;
    return {
      dossier: cell.getDossier(),
      events: cell.getEvents(),
      qualification: this.qualificationManager.get(id),
    };
  }

  /**
   * §18 — compact 15-market overview: ranks all 90 cells by maturity,
   * persistence, evidence coherence, stability, contradiction, veto state,
   * regime, and quality band — NOT by a single blended score — and returns
   * only the top N worth surfacing.
   */
  getOverview(limit = 12): OverviewEntry[] {
    const entries: OverviewEntry[] = [];

    for (const [id, cell] of this.cells.entries()) {
      const dossier = cell.getDossier();
      if (!dossier) continue;
      entries.push({
        dossier,
        explanation: cell.explainCurrent(),
        qualification: this.qualificationManager.get(id) ?? null,
        rank: 0,
      });
    }

    entries.sort((a, b) => {
      const stateDiff = (STATE_WEIGHT[b.dossier.state] ?? 0) - (STATE_WEIGHT[a.dossier.state] ?? 0);
      if (stateDiff !== 0) return stateDiff;

      const qualityDiff =
        qualityRank(assessQuality(b.dossier, b.dossier.momentumRelation).band) -
        qualityRank(assessQuality(a.dossier, a.dossier.momentumRelation).band);
      if (qualityDiff !== 0) return qualityDiff;

      const contradictionDiff = a.dossier.contradictions - b.dossier.contradictions;
      if (contradictionDiff !== 0) return contradictionDiff;

      return b.dossier.currentStateSince - a.dossier.currentStateSince;
    });

    return entries.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  getAllQualified(): QualifiedOpportunity[] {
    return this.qualificationManager.getAllActive();
  }
}

function qualityRank(band: "EXCEPTIONAL" | "STRONG" | "MODERATE" | "WEAK"): number {
  return { EXCEPTIONAL: 3, STRONG: 2, MODERATE: 1, WEAK: 0 }[band];
}

export const observationEngine = new ObservationEngine();

export { MARKET_IDS, PROPOSITIONS };
