// SENTINEL CONTINUOUS OBSERVATION LAYER — 90-CELL UNIVERSE OVERVIEW (§18)
//
// Maintains continuous, independent observation over all 15 markets across all
// six Over/Under propositions (90 cells total).
//
// Ranks by maturity, persistence, stability, contradiction state, and quality band.
// Shows live health monitoring alongside immutable qualification snapshots.
// Nothing is blended into a single numeric score.

import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  Info,
  Layers,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  observationEngine,
  MARKET_IDS,
  PROPOSITIONS,
  cellId,
  type ObservationDossier,
  type ObservationState,
  type Proposition,
  type MarketId,
  type QualifiedOpportunity,
  type OverviewEntry,
} from "@/lib/sentinel/observation";
import { Button } from "@/components/ui/button";

const STATE_TONE: Record<ObservationState, { color: string; bg: string; border: string }> = {
  WATCHING: {
    color: "var(--muted-foreground)",
    bg: "hsl(var(--muted)/0.3)",
    border: "hsl(var(--border))",
  },
  INTERESTING: {
    color: "var(--neon)",
    bg: "color-mix(in oklch, var(--background) 90%, var(--neon))",
    border: "var(--neon)",
  },
  DEVELOPING: {
    color: "var(--neon)",
    bg: "color-mix(in oklch, var(--background) 80%, var(--neon))",
    border: "var(--neon)",
  },
  CONFIRMING: {
    color: "var(--warn)",
    bg: "color-mix(in oklch, var(--background) 80%, var(--warn))",
    border: "var(--warn)",
  },
  RIPE: {
    color: "var(--bull)",
    bg: "color-mix(in oklch, var(--background) 70%, var(--bull))",
    border: "var(--bull)",
  },
  DECAYING: {
    color: "var(--warn)",
    bg: "color-mix(in oklch, var(--background) 85%, var(--warn))",
    border: "var(--warn)",
  },
  CONFLICT: {
    color: "var(--bear)",
    bg: "color-mix(in oklch, var(--background) 80%, var(--bear))",
    border: "var(--bear)",
  },
  UNSTABLE: {
    color: "var(--warn)",
    bg: "color-mix(in oklch, var(--background) 85%, var(--warn))",
    border: "var(--warn)",
  },
  VETOED: {
    color: "var(--bear)",
    bg: "color-mix(in oklch, var(--background) 90%, var(--bear))",
    border: "var(--bear)",
  },
  REJECTED: {
    color: "var(--bear)",
    bg: "color-mix(in oklch, var(--background) 92%, var(--bear))",
    border: "hsl(var(--border))",
  },
  EXPIRED: {
    color: "var(--muted-foreground)",
    bg: "hsl(var(--muted)/0.2)",
    border: "hsl(var(--border)/0.5)",
  },
  ABANDONED: {
    color: "var(--muted-foreground)",
    bg: "hsl(var(--muted)/0.1)",
    border: "hsl(var(--border)/0.3)",
  },
};

const HEALTH_TONE: Record<string, string> = {
  HEALTHY: "var(--bull)",
  AT_RISK: "var(--warn)",
  EXPIRED: "var(--muted-foreground)",
  INVALIDATED: "var(--bear)",
};

interface ObservationUniverseOverviewProps {
  onSelectProposition?: (market: string, prop: string) => void;
}

export function ObservationUniverseOverview({
  onSelectProposition,
}: ObservationUniverseOverviewProps) {
  const [selectedCell, setSelectedCell] = useState<{ market: MarketId; prop: Proposition } | null>(
    null,
  );
  const [filterState, setFilterState] = useState<string>("ALL");
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLiveTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Read overview entries and active qualifications from observation engine
  const overview = useMemo(() => observationEngine.getOverview(90), [liveTick]);
  const qualifiedList = useMemo(() => observationEngine.getAllQualified(), [liveTick]);
  const healthReport = useMemo(() => observationEngine.getHealthStatus(), [liveTick]);

  const selectedDossier = useMemo(() => {
    if (!selectedCell) return null;
    return observationEngine.getCell(selectedCell.market, selectedCell.prop);
  }, [selectedCell, liveTick]);

  const filteredOverview = useMemo(() => {
    if (filterState === "ALL") return overview;
    if (filterState === "ACTIVE_ONLY") {
      return overview.filter((e) =>
        ["RIPE", "CONFIRMING", "DEVELOPING", "INTERESTING"].includes(e.dossier.state),
      );
    }
    if (filterState === "RIPE_ONLY") {
      return overview.filter((e) => e.dossier.state === "RIPE");
    }
    if (filterState === "CONFLICT_ONLY") {
      return overview.filter((e) => ["CONFLICT", "UNSTABLE", "VETOED"].includes(e.dossier.state));
    }
    return overview;
  }, [overview, filterState]);

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--neon)]" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-foreground">
              Observation Layer Universe · 90 Independent Cells
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Continuous background state machines tracking 15 synthetic markets across 6 Over/Under
            propositions.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filterState === "ALL" ? "default" : "outline"}
            onClick={() => setFilterState("ALL")}
            className="h-7 text-[11px]"
          >
            All 90 Cells
          </Button>
          <Button
            size="sm"
            variant={filterState === "ACTIVE_ONLY" ? "default" : "outline"}
            onClick={() => setFilterState("ACTIVE_ONLY")}
            className="h-7 text-[11px]"
          >
            Developing / Ripe (
            {
              overview.filter((e) =>
                ["RIPE", "CONFIRMING", "DEVELOPING", "INTERESTING"].includes(e.dossier.state),
              ).length
            }
            )
          </Button>
          <Button
            size="sm"
            variant={filterState === "RIPE_ONLY" ? "default" : "outline"}
            onClick={() => setFilterState("RIPE_ONLY")}
            className="h-7 text-[11px] text-[var(--bull)]"
          >
            Ripe ({overview.filter((e) => e.dossier.state === "RIPE").length})
          </Button>
          <Button
            size="sm"
            variant={filterState === "CONFLICT_ONLY" ? "default" : "outline"}
            onClick={() => setFilterState("CONFLICT_ONLY")}
            className="h-7 text-[11px] text-[var(--bear)]"
          >
            Conflict / Vetoed (
            {
              overview.filter((e) => ["CONFLICT", "UNSTABLE", "VETOED"].includes(e.dossier.state))
                .length
            }
            )
          </Button>
        </div>
      </div>

      {/* OBSERVATION ENGINE HEALTH STRIP (§7) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-border/50 bg-background/30 p-3 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              healthReport.status === "HEALTHY"
                ? "bg-[var(--bull)]"
                : healthReport.status === "DEGRADED"
                  ? "bg-[var(--warn)]"
                  : "bg-[var(--bear)]"
            }`}
          />
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Engine Health
            </span>
            <p className="font-semibold text-foreground">{healthReport.status}</p>
          </div>
        </div>
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Universe Coverage
          </span>
          <p className="font-semibold text-foreground">
            {healthReport.cellsObserved} / {healthReport.cellsTotal} Observed (
            {healthReport.cellsRipe} Ripe)
          </p>
        </div>
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Active / Vetoed
          </span>
          <p className="font-semibold text-foreground">
            {healthReport.cellsActive} Active · {healthReport.cellsVetoed} Vetoed
          </p>
        </div>
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Ingestion Pipeline
          </span>
          <p className="font-semibold text-foreground">
            {healthReport.ingestErrors === 0 ? "0 Errors" : `${healthReport.ingestErrors} Errors`} (
            {healthReport.lastTickLatencyMs.toFixed(1)}ms latency)
          </p>
        </div>
      </div>

      {/* ACTIVE QUALIFICATIONS / EXECUTION WINDOWS */}
      {qualifiedList.length > 0 && (
        <section className="rounded-xl border border-[var(--bull)]/60 bg-[color-mix(in_oklch,var(--background)_85%,var(--bull))] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--bull)]" />
              <h4 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--bull)]">
                Active Execution-Qualified Opportunities ({qualifiedList.length})
              </h4>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Fixed 90s Execution Windows
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {qualifiedList.map((q) => {
              const remainingSec = Math.max(
                0,
                Math.round((q.snapshot.executionWindowExpiresAt - Date.now()) / 1000),
              );
              return (
                <div
                  key={q.cellId}
                  className="rounded-lg border border-border/80 bg-background/80 p-3 transition-colors hover:border-[var(--bull)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {q.snapshot.marketId} · {q.snapshot.proposition}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                      style={{
                        color: HEALTH_TONE[q.liveHealth] ?? "var(--muted-foreground)",
                        backgroundColor: `color-mix(in oklch, var(--background) 80%, ${HEALTH_TONE[q.liveHealth] ?? "var(--muted-foreground)"})`,
                      }}
                    >
                      {q.liveHealth}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Entry Digit:</span>{" "}
                      <span className="font-mono font-bold text-[var(--neon)]">
                        {q.snapshot.qualificationDigit ?? "WAIT"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality:</span>{" "}
                      <span className="font-mono font-bold">{q.snapshot.qualificationQuality}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Regime:</span>{" "}
                      <span className="font-mono text-[10px]">
                        {q.snapshot.regimeAtQualification}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Window:</span>{" "}
                      <span className="font-mono font-bold text-[var(--warn)]">
                        {remainingSec}s left
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 border-t border-border/40 pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Immutable at {new Date(q.snapshot.qualifiedAt).toLocaleTimeString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] gap-1 text-[var(--neon)]"
                      onClick={() => {
                        setSelectedCell({
                          market: q.snapshot.marketId,
                          prop: q.snapshot.proposition,
                        });
                        onSelectProposition?.(q.snapshot.marketId, q.snapshot.proposition);
                      }}
                    >
                      Inspect <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 15-MARKET × 6-PROPOSITION COMPACT MATRIX */}
      <section className="rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <h4 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground">
            Universe State Matrix (15 Markets × 6 Propositions)
          </h4>
          <span className="text-[11px] text-muted-foreground">
            Click any cell to inspect evidence dossier
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 font-mono text-[10px] uppercase text-muted-foreground">
                <th className="py-2 px-3">Market</th>
                {PROPOSITIONS.map((p) => (
                  <th key={p} className="py-2 px-2 text-center">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {MARKET_IDS.map((market) => (
                <tr key={market} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 font-mono font-bold text-foreground whitespace-nowrap">
                    {market}
                  </td>
                  {PROPOSITIONS.map((prop) => {
                    const cell = observationEngine.getCell(market, prop);
                    const state = cell.dossier?.state ?? "WATCHING";
                    const tone = STATE_TONE[state] ?? STATE_TONE.WATCHING;
                    const isSelected =
                      selectedCell?.market === market && selectedCell?.prop === prop;

                    return (
                      <td key={prop} className="py-2 px-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCell({ market, prop });
                            onSelectProposition?.(market, prop);
                          }}
                          className={`w-full rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all duration-150 border ${
                            isSelected ? "ring-2 ring-[var(--neon)] scale-105" : ""
                          }`}
                          style={{
                            color: tone.color,
                            backgroundColor: tone.bg,
                            borderColor: tone.border,
                          }}
                        >
                          {state}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SELECTED CELL DOSSIER & EVIDENCE INSPECTOR */}
      {selectedDossier && selectedCell && (
        <section className="rounded-xl border border-border/80 bg-background/60 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[var(--neon)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--neon)] border border-[var(--neon)]/30">
                  {selectedCell.market}
                </span>
                <span className="font-mono text-sm font-bold text-foreground">
                  Proposition: {selectedCell.prop}
                </span>
                <span
                  className="rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase border"
                  style={{
                    color: STATE_TONE[selectedDossier.dossier?.state ?? "WATCHING"].color,
                    backgroundColor: STATE_TONE[selectedDossier.dossier?.state ?? "WATCHING"].bg,
                    borderColor: STATE_TONE[selectedDossier.dossier?.state ?? "WATCHING"].border,
                  }}
                >
                  {selectedDossier.dossier?.state ?? "WATCHING"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cell ID: {cellId(selectedCell.market, selectedCell.prop)} · Stability:{" "}
                <span className="font-mono font-bold text-foreground">
                  {selectedDossier.dossier?.stability ?? "DEVELOPING"}
                </span>{" "}
                · Contradictions:{" "}
                <span className="font-mono font-bold text-[var(--bear)]">
                  {selectedDossier.dossier?.contradictions ?? 0}
                </span>
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCell(null)}
              className="h-7 text-xs"
            >
              Close Inspector
            </Button>
          </div>

          {/* DYNAMIC EXPLANATION */}
          <div className="rounded-lg border border-border/50 bg-background/40 p-3">
            <h5 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--neon)]">
              Continuous Intelligence Assessment
            </h5>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">
              {selectedDossier.dossier?.state === "RIPE"
                ? "This setup has achieved full directional persistence and entry digit confirmation without hard vetoes."
                : selectedDossier.dossier?.state === "CONFLICT"
                  ? "Evidence streams are actively contradicting (e.g. structural direction vs opposing losing-side pressure)."
                  : "Watching state machine: evaluating persistence, pressure windows, and structural validity before qualification."}
            </p>
          </div>

          {/* EVIDENCE DOSSIER GRID */}
          {selectedDossier.dossier && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 text-xs">
              <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground flex items-center justify-between">
                  <span>Psychology</span>
                  <span className="text-[9px] text-[var(--neon)]">1,000-TICK</span>
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">
                  {selectedDossier.dossier.psychology.direction}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{selectedDossier.dossier.psychology.state}</span>
                  <span
                    className="font-bold"
                    style={{
                      color:
                        selectedDossier.dossier.psychology.support === "SUPPORTING"
                          ? "var(--bull)"
                          : selectedDossier.dossier.psychology.support === "OPPOSING"
                            ? "var(--bear)"
                            : "var(--muted-foreground)",
                    }}
                  >
                    {selectedDossier.dossier.psychology.support}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground flex items-center justify-between">
                  <span>Entry Digit</span>
                  <span className="text-[9px] text-[var(--neon)]">BARRIER</span>
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-[var(--neon)]">
                  {selectedDossier.dossier.entryDigit.digit !== null
                    ? `Digit ${selectedDossier.dossier.entryDigit.digit}`
                    : "WAITING"}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>State: {selectedDossier.dossier.entryDigit.state}</span>
                  {selectedDossier.dossier.entryDigit.dangerousCompetitor && (
                    <span className="font-bold text-[var(--bear)]">COMPETITOR</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground flex items-center justify-between">
                  <span>Pressure Windows</span>
                  <span className="text-[9px]">15/30/60/120</span>
                </span>
                <p className="mt-1 font-mono text-xs font-bold text-foreground">
                  {selectedDossier.dossier?.pressure?.byWindow?.[15] ?? "—"} /{" "}
                  {selectedDossier.dossier?.pressure?.byWindow?.[30] ?? "—"} /{" "}
                  {selectedDossier.dossier?.pressure?.byWindow?.[60] ?? "—"} /{" "}
                  {selectedDossier.dossier?.pressure?.byWindow?.[120] ?? "—"}
                </p>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Trend: {selectedDossier.dossier?.pressure?.candidateDigitTrend ?? "FLAT"}
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground flex items-center justify-between">
                  <span>Losing-Side Pressure</span>
                  <span className="text-[9px]">HOSTILITY</span>
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">
                  {selectedDossier.dossier.losingSidePressure.state}
                </p>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Severity: {selectedDossier.dossier.losingSidePressure.severity}
                </div>
              </div>

              {/* DANGER ANALYSIS ENGINE */}
              <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground flex items-center justify-between">
                  <span>Danger Analysis</span>
                  <span
                    className="font-mono font-bold"
                    style={{
                      color:
                        selectedDossier.dossier.danger?.level === "CALM"
                          ? "var(--bull)"
                          : selectedDossier.dossier.danger?.level === "LOW"
                            ? "var(--neon)"
                            : selectedDossier.dossier.danger?.level === "ELEVATED"
                              ? "var(--warn)"
                              : "var(--bear)",
                    }}
                  >
                    {selectedDossier.dossier.danger?.total ?? 0}/100
                  </span>
                </span>
                <p
                  className="mt-1 font-mono text-sm font-bold"
                  style={{
                    color:
                      selectedDossier.dossier.danger?.level === "CALM"
                        ? "var(--bull)"
                        : selectedDossier.dossier.danger?.level === "LOW"
                          ? "var(--neon)"
                          : selectedDossier.dossier.danger?.level === "ELEVATED"
                            ? "var(--warn)"
                            : "var(--bear)",
                  }}
                >
                  {selectedDossier.dossier.danger?.level ?? "CALM"}
                </p>
                <div className="mt-1 text-[10px] text-muted-foreground truncate">
                  {selectedDossier.dossier.danger?.components?.length
                    ? `${selectedDossier.dossier.danger.components.length} risk factor(s)`
                    : "No active risk components"}
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground flex items-center justify-between">
                  <span>Regime Compatibility</span>
                  <span className="text-[9px]">REGIME</span>
                </span>
                <p className="mt-1 font-mono text-xs font-bold text-foreground">
                  {selectedDossier.dossier.regime.classification}
                </p>
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color:
                      selectedDossier.dossier.regime.compatibility === "COMPATIBLE"
                        ? "var(--bull)"
                        : "var(--warn)",
                  }}
                >
                  {selectedDossier.dossier.regime.compatibility}
                </span>
              </div>
            </div>
          )}

          {/* MARKET THESIS IF PRESENT */}
          {selectedDossier.dossier?.thesis && (
            <div className="rounded-lg border border-[var(--neon)]/30 bg-[var(--neon)]/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--neon)]" />
                  <h6 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--neon)]">
                    Market Thesis · {selectedDossier.dossier.thesis.direction}
                  </h6>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">Confidence:</span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {(selectedDossier.dossier.thesis.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="rounded bg-background/80 px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--neon)] border border-[var(--neon)]/30">
                    {selectedDossier.dossier.thesis.agreement}
                  </span>
                </div>
              </div>

              {selectedDossier.dossier.thesis.structuralFactors.length > 0 && (
                <div className="text-xs">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    Supporting Structural Factors:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedDossier.dossier.thesis.structuralFactors.map((factor, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-background/70 px-2 py-0.5 font-mono text-[11px] text-[var(--bull)] border border-[var(--bull)]/30"
                      >
                        ✓ {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedDossier.dossier.thesis.counterEvidence.length > 0 && (
                <div className="text-xs pt-1 border-t border-border/40">
                  <span className="font-mono text-[10px] uppercase text-[var(--bear)]">
                    Active Counter-Evidence:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedDossier.dossier.thesis.counterEvidence.map((counter, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-[var(--bear)]/10 px-2 py-0.5 font-mono text-[11px] text-[var(--bear)] border border-[var(--bear)]/30"
                      >
                        ⚠ {counter}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DANGER DETAIL BREAKDOWN IF ACTIVE */}
          {selectedDossier.dossier?.danger?.components &&
            selectedDossier.dossier.danger.components.length > 0 && (
              <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn)]/5 p-3">
                <h6 className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--warn)]">
                  Active Danger Engine Audit ({selectedDossier.dossier.danger.components.length}{" "}
                  factor(s))
                </h6>
                <div className="mt-2 space-y-1.5">
                  {selectedDossier.dossier.danger.components.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-foreground/90 font-medium">
                        {c.isAutoBlock ? "⛔ [AUTO-BLOCK] " : "⚠️ "}
                        {c.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">{c.value}</span>
                        <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-bold text-[var(--bear)]">
                          +{c.points} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </section>
      )}
    </div>
  );
}
