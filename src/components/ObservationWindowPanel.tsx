/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  PropositionObservationState,
  MarketObservationState,
  ObservationState,
  StabilityState,
} from "../lib/sentinel/observation-layer";
import {
  Eye,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Layers,
  Zap,
  Lock,
  Flame,
  History,
  Compass,
  AlertOctagon,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Target,
} from "lucide-react";

interface ObservationWindowPanelProps {
  observationState?: PropositionObservationState | null;
  marketObservation?: MarketObservationState | null;
  marketSymbol?: string;
  contract?: string;
  compact?: boolean;
}

export const ObservationWindowPanel: React.FC<ObservationWindowPanelProps> = ({
  observationState,
  marketObservation,
  marketSymbol,
  contract,
  compact = false,
}) => {
  if (!observationState) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs flex items-center gap-2 font-mono">
        <Eye className="w-4 h-4 text-cyan-400" />
        <span>
          Initializing Stateful Observation Layer for {marketSymbol || "Market"} {contract || ""}...
        </span>
      </div>
    );
  }

  const {
    currentStage,
    timeInCurrentStageMs,
    totalObservations,
    consecutiveQualifiedCount,
    requiredConfirmations,
    confirmationProgress,
    stability,
    dossier,
    snapshots,
    analytics,
    transitions,
  } = observationState;

  // Format stage duration
  const secondsInStage = Math.floor(timeInCurrentStageMs / 1000);
  const minutesInStage = Math.floor(secondsInStage / 60);
  const durationDisplay =
    minutesInStage > 0 ? `${minutesInStage}m ${secondsInStage % 60}s` : `${secondsInStage}s`;

  // Stage badge color helper
  const getStageBadgeColor = (stage: ObservationState) => {
    switch (stage) {
      case "RIPE":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)] font-bold";
      case "EXECUTION_WINDOW":
        return "bg-amber-500/30 text-amber-200 border-amber-400 font-bold";
      case "CONFIRMING":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)] font-bold";
      case "DEVELOPING":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold";
      case "FORMATION":
      case "INTERESTING":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40 font-medium";
      case "WATCHING":
      case "DORMANT":
        return "bg-slate-800/80 text-slate-300 border-slate-700";
      case "CONFLICT":
      case "ABANDONED":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "DECAYING":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "UNSTABLE":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "REJECTED":
      case "VETOED":
        return "bg-red-950/80 text-red-400 border-red-800";
      case "EXPIRED":
      case "INVALIDATED":
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getStageIcon = (stage: ObservationState) => {
    switch (stage) {
      case "RIPE":
      case "EXECUTION_WINDOW":
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case "CONFIRMING":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "DEVELOPING":
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      case "FORMATION":
      case "INTERESTING":
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case "CONFLICT":
      case "ABANDONED":
        return <AlertOctagon className="w-3.5 h-3.5 text-purple-400" />;
      case "UNSTABLE":
      case "REJECTED":
      case "VETOED":
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Eye className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStabilityBadgeColor = (stab: StabilityState) => {
    switch (stab) {
      case "CALM":
      case "STABLE":
        return "bg-emerald-950/70 text-emerald-400 border-emerald-800/70";
      case "DEVELOPING":
        return "bg-cyan-950/70 text-cyan-400 border-cyan-800/70";
      case "TRANSITIONING":
      case "FLUCTUATING":
        return "bg-amber-950/70 text-amber-400 border-amber-800/70";
      case "CHOPPY":
      case "HIGHLY_UNSTABLE":
        return "bg-rose-950/70 text-rose-400 border-rose-800/70";
      default:
        return "bg-slate-900 text-slate-400 border-slate-800";
    }
  };

  const renderArrow = (dir: "SUPPORTING" | "OPPOSING" | "NEUTRAL" | "MIXED") => {
    if (dir === "SUPPORTING")
      return <ArrowUpRight className="w-3 h-3 text-emerald-400 inline ml-0.5" />;
    if (dir === "OPPOSING")
      return <ArrowDownRight className="w-3 h-3 text-rose-400 inline ml-0.5" />;
    return <ArrowRight className="w-3 h-3 text-slate-500 inline ml-0.5" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${getStageBadgeColor(currentStage)}`}
        >
          {getStageIcon(currentStage)}
          {currentStage}
        </span>
        <span className="text-slate-400 text-[10px]">
          ({totalObservations} ticks • {durationDisplay})
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Master Observation Dossier Card */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-900/40 shadow-xl space-y-4">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-inner">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Sentinel Observation Dossier
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                  {marketSymbol || dossier?.market} • {contract || dossier?.contract}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Psychology formation & live lifecycle across {totalObservations} ticks (
                {durationDisplay} in stage)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Observation State Badge */}
            <div
              className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-xs flex items-center gap-1.5 ${getStageBadgeColor(currentStage)}`}
            >
              {getStageIcon(currentStage)}
              <span>LIFECYCLE: {currentStage}</span>
            </div>

            {/* Stability State Badge */}
            <div
              className={`px-2.5 py-1.5 rounded-lg border font-mono text-[11px] font-semibold ${getStabilityBadgeColor(stability)}`}
            >
              STABILITY: {stability}
            </div>
          </div>
        </div>

        {/* Current Assessment / Dynamic Explanation Box */}
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-3 ${
            currentStage === "RIPE" || currentStage === "EXECUTION_WINDOW"
              ? "bg-amber-950/30 border-amber-600/60 text-amber-200"
              : currentStage === "CONFIRMING"
                ? "bg-emerald-950/30 border-emerald-600/60 text-emerald-200"
                : currentStage === "CONFLICT" || currentStage === "ABANDONED"
                  ? "bg-purple-950/30 border-purple-600/60 text-purple-200"
                  : currentStage === "UNSTABLE" ||
                      currentStage === "REJECTED" ||
                      currentStage === "VETOED"
                    ? "bg-rose-950/30 border-rose-600/60 text-rose-200"
                    : "bg-slate-900/80 border-slate-700/80 text-slate-300"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {currentStage === "RIPE" || currentStage === "EXECUTION_WINDOW" ? (
              <Flame className="w-4 h-4 text-amber-400" />
            ) : (
              <Compass className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className="space-y-1 w-full">
            <div className="font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Assessment: {dossier?.currentAssessment?.replace(/_/g, " ")}</span>
              {(currentStage === "RIPE" || currentStage === "EXECUTION_WINDOW") && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/40">
                  TRADEABLE NOW
                </span>
              )}
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">{dossier?.why}</p>
            {dossier?.explanation?.isRipe && dossier?.explanation?.whyRipe.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-500/30 space-y-1 text-[10px]">
                <span className="font-bold text-amber-300 uppercase">
                  Opportunity Ripe Evidence Pillars:
                </span>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-slate-300">
                  {dossier.explanation.whyRipe.map((pt, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Continuous Regime Observation & Transition Layer (Pillar 6) */}
        {(dossier?.regimeObservation || dossier?.regime) &&
          (() => {
            const reg =
              dossier?.regimeObservation ||
              (typeof dossier?.regime === "object" && "compatibility" in (dossier.regime as any)
                ? (dossier.regime as any)
                : null);
            if (!reg || !reg.compatibility) return null;
            const momentum = reg.momentum || {
              momentum_side: reg.momentum_side || "UNKNOWN",
              momentum_state: reg.momentum_state || "UNKNOWN",
              momentum_strength: reg.momentum_strength || 0,
              momentum_acceleration: reg.momentum_acceleration || 0,
              momentum_confidence: reg.momentum_confidence || 0,
              under_momentum_score: 0.5,
              over_momentum_score: 0.5,
              regime_momentum_alignment: "Digit momentum aligned with current regime context",
            };
            const maturity = reg.maturity || "DEVELOPING";
            const freshness = Math.round(
              (reg.evidenceFreshness ?? reg.evidence_freshness ?? 0.9) * 100,
            );

            return (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-3 font-mono text-xs shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                      CONTINUOUS REGIME OBSERVER & DIGIT MOMENTUM ENGINE
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        reg.compatibility?.isCompatible
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                          : "bg-rose-950/80 text-rose-300 border-rose-700"
                      }`}
                    >
                      COMPATIBILITY: {reg.compatibility?.verdict || "UNKNOWN"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        reg.stability === "HIGH"
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                          : reg.stability === "MODERATE"
                            ? "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                            : "bg-amber-950/80 text-amber-300 border-amber-800"
                      }`}
                    >
                      STABILITY: {reg.stability || "CALM"} ({reg.stabilityScore ?? 80}%)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      FRESHNESS: {freshness}%
                    </span>
                  </div>
                </div>

                {/* Grid Row 1: Regime Intelligence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* 1. Current Regime & Confidence */}
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                      CURRENT REGIME
                    </div>
                    <div className="text-sm font-black text-cyan-300">
                      {reg.displayName || "CALM/STABLE"}
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>
                        Confidence:{" "}
                        <strong className="text-slate-200">{reg.confidence ?? 60}%</strong>
                      </span>
                      <span>
                        Prob:{" "}
                        <strong className="text-slate-200">
                          {Math.round(
                            (reg.candidateProbabilities?.[reg.currentRegime] ?? 0.6) * 100,
                          )}
                          %
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* 2. Maturity & Age */}
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                      REGIME MATURITY & AGE
                    </div>
                    <div className="text-xs font-bold text-slate-100 flex items-center justify-between">
                      <span className="text-emerald-400 font-black">{maturity}</span>
                      <span className="text-slate-400 font-normal">
                        {reg.regimeAgeTicks ?? 0} ticks
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>
                        Trend:{" "}
                        <strong
                          className={maturity === "WEAKENING" ? "text-amber-400" : "text-slate-200"}
                        >
                          {maturity === "WEAKENING" ? "WEAKENING" : "PERSISTENT"}
                        </strong>
                      </span>
                      <span>
                        State:{" "}
                        <strong className="text-slate-200">{reg.stability || "STABLE"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 3. Transition & Probability */}
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                      REGIME TRANSITION
                    </div>
                    <div
                      className={`text-xs font-bold truncate ${
                        reg.isTransitioning ? "text-amber-300" : "text-emerald-400"
                      }`}
                      title={reg.transitionDisplayName || "Stable in Regime"}
                    >
                      {reg.transitionDisplayName || "Stable in Regime"}
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>
                        Transition Prob:{" "}
                        <strong className="text-slate-200">
                          {reg.transitionProbability ?? 0}%
                        </strong>
                      </span>
                      <span>
                        Conf:{" "}
                        <strong className="text-slate-200">{reg.transitionConfidence ?? 0}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* 4. Regime-Conditioned Edge */}
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                      REGIME-CONDITIONED EDGE
                    </div>
                    <div className="text-sm font-black text-emerald-400">
                      {reg.regimeSpecificStats?.winRate ?? 75}% Win Rate
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>
                        Wilson:{" "}
                        <strong className="text-slate-200">
                          {reg.regimeSpecificStats?.wilsonLowerBound ?? 65}%
                        </strong>
                      </span>
                      <span>
                        Sample:{" "}
                        <strong className="text-slate-200">
                          N={reg.regimeSpecificStats?.sampleSize ?? 0}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid Row 2: Digit Momentum Engine */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-800/60">
                  {/* 1. Momentum Side */}
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                    <div className="text-[9px] text-slate-500 font-bold uppercase">
                      CURRENT MOMENTUM
                    </div>
                    <div className="text-xs font-black text-cyan-300">
                      {momentum.momentum_side || "BALANCED"} SIDE
                    </div>
                    <div className="text-[9px] text-slate-400 flex justify-between">
                      <span>0-4: {Math.round((momentum.under_momentum_score ?? 0.5) * 100)}%</span>
                      <span>5-9: {Math.round((momentum.over_momentum_score ?? 0.5) * 100)}%</span>
                    </div>
                  </div>

                  {/* 2. Momentum State */}
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                    <div className="text-[9px] text-slate-500 font-bold uppercase">
                      MOMENTUM STATE
                    </div>
                    <div
                      className={`text-xs font-black ${
                        momentum.momentum_state === "ACCELERATING"
                          ? "text-emerald-400"
                          : momentum.momentum_state === "DECELERATING"
                            ? "text-amber-400"
                            : momentum.momentum_state === "REVERSING"
                              ? "text-rose-400"
                              : "text-slate-200"
                      }`}
                    >
                      {momentum.momentum_state || "STABLE"}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Trajectory:{" "}
                      {momentum.momentum_state === "ACCELERATING"
                        ? "↑ Gaining Speed"
                        : momentum.momentum_state === "DECELERATING"
                          ? "↓ Slowing"
                          : "↔ Steady"}
                    </div>
                  </div>

                  {/* 3. Momentum Strength & Acceleration */}
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                    <div className="text-[9px] text-slate-500 font-bold uppercase">
                      MOMENTUM STRENGTH
                    </div>
                    <div className="text-xs font-black text-slate-100">
                      {Math.round((momentum.momentum_strength ?? 0) * 100)}%
                    </div>
                    <div className="text-[9px] text-slate-400 flex justify-between">
                      <span>
                        Accel:{" "}
                        <strong className="text-slate-200">
                          {(momentum.momentum_acceleration ?? 0) > 0 ? "+" : ""}
                          {(momentum.momentum_acceleration ?? 0).toFixed(2)}
                        </strong>
                      </span>
                      <span>
                        Conf:{" "}
                        <strong className="text-slate-200">
                          {Math.round((momentum.momentum_confidence ?? 0.7) * 100)}%
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* 4. Setup Compatibility & Stale Discount */}
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                    <div className="text-[9px] text-slate-500 font-bold uppercase">
                      REGIME COMPATIBILITY
                    </div>
                    <div
                      className="text-[11px] font-bold text-slate-200 truncate"
                      title={reg.compatibility?.reason || "Compatible"}
                    >
                      {reg.compatibility?.reason || "Baseline compatible."}
                    </div>
                    <div className="text-[9px] text-slate-400 flex justify-between">
                      <span>
                        Score:{" "}
                        <strong className="text-cyan-300">
                          {reg.compatibility?.compatibilityScore ?? 80}/100
                        </strong>
                      </span>
                      {(reg.compatibility?.staleEvidenceDiscount ?? 0) > 0 && (
                        <span className="text-amber-400">
                          -{Math.round((reg.compatibility?.staleEvidenceDiscount ?? 0) * 100)}%
                          Discount
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Regime & Momentum Alignment Summary */}
                {momentum.regime_momentum_alignment && (
                  <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-bold">►</span>
                    <span className="text-slate-300 italic">
                      {momentum.regime_momentum_alignment}
                    </span>
                  </div>
                )}

                {/* Regime-Specific Evidence Pills */}
                {(reg.regimeSpecificEvidence?.length ?? reg.evidence?.length ?? 0) > 0 && (
                  <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold text-slate-500 uppercase">Regime Evidence:</span>
                    {(reg.regimeSpecificEvidence || reg.evidence || []).map(
                      (ev: string, idx: number) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/60"
                        >
                          <span className="text-cyan-400">•</span>
                          <span>{ev}</span>
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {/* Evidence Dimensions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {/* 1. Structural Psychology (1,000 Ticks) */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
              <span>1,000-Tick Psychology</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  dossier?.psychologyEvolution?.state === "COHERENT" ||
                  dossier?.psychologyEvolution?.state === "STRENGTHENING"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : dossier?.psychologyEvolution?.state === "FORMING"
                      ? "bg-blue-950 text-blue-300 border border-blue-800"
                      : "bg-slate-800 text-slate-400"
                }`}
              >
                {dossier?.psychologyEvolution?.state || "FORMING"}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Parity:</span>
                <span className="font-semibold text-slate-200">
                  {dossier?.psychologyEvolution?.parityAlignment ||
                    dossier?.distribution.parityBias}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Green Digits:</span>
                <span className="font-semibold text-emerald-400">
                  [{dossier?.distribution.greenDigit}, {dossier?.distribution.secondGreenDigit}]
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Red Digits:</span>
                <span className="font-semibold text-rose-400">
                  [{dossier?.distribution.redDigit}, {dossier?.distribution.secondRedDigit}]
                </span>
              </div>
            </div>
          </div>

          {/* 2. Specific Entry Digit Validation */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
              <span>Specific Entry Digit</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  dossier?.specificEntryDigit?.isValidated
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-slate-800 text-amber-300 border border-slate-700"
                }`}
              >
                {dossier?.specificEntryDigit?.isValidated ? "VALIDATED" : "WAITING"}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Digit:</span>
                <span className="font-semibold text-cyan-400">
                  {dossier?.specificEntryDigit?.entryDigit !== null &&
                  dossier?.specificEntryDigit?.entryDigit !== undefined
                    ? `Digit ${dossier.specificEntryDigit.entryDigit}`
                    : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Empirical Rate:</span>
                <span className="font-semibold text-emerald-400">
                  {dossier?.specificEntryDigit?.empiricalRate
                    ? `${dossier.specificEntryDigit.empiricalRate}%`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wilson Lower:</span>
                <span className="font-semibold text-slate-200">
                  {dossier?.specificEntryDigit?.wilsonLowerBound
                    ? `${dossier.specificEntryDigit.wilsonLowerBound}%`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Multi-Window Pressure (15/30/60/120) */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
              <span>Multi-Window Pressure</span>
              <span className="text-[9px] text-cyan-400">
                {dossier?.pressure.classification.replace(/_/g, " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
              <div className="flex justify-between bg-slate-950/60 px-1.5 py-0.5 rounded">
                <span className="text-slate-500">15:</span>
                <span>
                  {dossier?.pressure.window15}{" "}
                  {renderArrow(dossier?.pressure.window15 || "NEUTRAL")}
                </span>
              </div>
              <div className="flex justify-between bg-slate-950/60 px-1.5 py-0.5 rounded">
                <span className="text-slate-500">30:</span>
                <span>
                  {dossier?.pressure.window30}{" "}
                  {renderArrow(dossier?.pressure.window30 || "NEUTRAL")}
                </span>
              </div>
              <div className="flex justify-between bg-slate-950/60 px-1.5 py-0.5 rounded">
                <span className="text-slate-500">60:</span>
                <span>
                  {dossier?.pressure.window60}{" "}
                  {renderArrow(dossier?.pressure.window60 || "NEUTRAL")}
                </span>
              </div>
              <div className="flex justify-between bg-slate-950/60 px-1.5 py-0.5 rounded">
                <span className="text-slate-500">120:</span>
                <span>
                  {dossier?.pressure.window120}{" "}
                  {renderArrow(dossier?.pressure.window120 || "NEUTRAL")}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Losing Side & Safety Vetoes */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
              <span>Losing Side Safety</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  dossier?.losingSidePressure.trend === "DECREASING" ||
                  dossier?.losingSidePressure.trend === "DECLINING"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : dossier?.losingSidePressure.trend === "INCREASING"
                      ? "bg-rose-950 text-rose-400 border border-rose-800"
                      : dossier?.losingSidePressure.level === "CALM"
                        ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/70"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}
              >
                {dossier?.losingSidePressure.trend === "DECREASING" ||
                dossier?.losingSidePressure.trend === "DECLINING"
                  ? "↓ DECREASING"
                  : dossier?.losingSidePressure.trend === "INCREASING"
                    ? "↑ INCREASING"
                    : `${dossier?.losingSidePressure.level || "CALM"}`}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Losing Score:</span>
                <span className="font-semibold text-slate-200">
                  {dossier?.losingSidePressure.aggregateScore}/100
                  {(dossier?.losingSidePressure.delta ?? 0) !== 0 && (
                    <span
                      className={
                        (dossier?.losingSidePressure.delta ?? 0) < 0
                          ? " text-emerald-400 ml-1"
                          : " text-rose-400 ml-1"
                      }
                    >
                      ({(dossier?.losingSidePressure.delta ?? 0) > 0 ? "+" : ""}
                      {dossier?.losingSidePressure.delta} pts)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Danger Trend:</span>
                <span className="font-semibold text-slate-200">
                  {dossier?.danger ? (
                    <span
                      className={
                        dossier.danger.trend === "DECREASING"
                          ? "text-emerald-400"
                          : dossier.danger.trend === "INCREASING"
                            ? "text-rose-400"
                            : "text-slate-300"
                      }
                    >
                      {dossier.danger.score}% (
                      {dossier.danger.trend === "DECREASING"
                        ? "↓ Cooling"
                        : dossier.danger.trend === "INCREASING"
                          ? "↑ Rising"
                          : "Stable"}
                      )
                    </span>
                  ) : (
                    <span>{dossier?.simulation?.winRate ?? 75}% Win Rate</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Risk Vetoes:</span>
                <span className="font-semibold text-slate-300">{dossier?.vetoes.join(", ")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formation Velocity & Execution Validity Window Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {/* Formation Velocity */}
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
              <span>Formation Velocity & Stability</span>
              <span className="text-cyan-400 font-bold">
                {dossier?.formationVelocity?.velocityRating || "STEADY"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500">Strengthening Rate: </span>
                <span className="font-semibold text-emerald-400">
                  +{dossier?.formationVelocity?.strengtheningRate ?? 0} pts/10t
                </span>
              </div>
              <div>
                <span className="text-slate-500">Entry Stability: </span>
                <span className="font-semibold text-slate-200">
                  {dossier?.formationVelocity?.digitSelectionStability ?? 0} ticks
                </span>
              </div>
            </div>
          </div>

          {/* Execution Validity Window */}
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
              <span>Live Execution Validity Window</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  dossier?.validityWindow?.validityState === "VALID"
                    ? "bg-emerald-950 text-emerald-400"
                    : "bg-amber-950 text-amber-400"
                }`}
              >
                {dossier?.validityWindow?.validityState || "VALID"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500">Remaining Validity: </span>
                <span className="font-semibold text-amber-300">
                  {dossier?.validityWindow?.remainingValiditySeconds ?? 90}s
                </span>
              </div>
              <div>
                <span className="text-slate-500">Total Window: </span>
                <span className="font-semibold text-slate-200">
                  {dossier?.validityWindow?.maxValiditySeconds ?? 90}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contradictions Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {/* Supporting Evidence List */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-1.5">
            <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center justify-between">
              <span>Supporting Evidence ({dossier?.supportingFactors.length || 0})</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {dossier?.supportingFactors && dossier.supportingFactors.length > 0 ? (
                dossier.supportingFactors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-emerald-200/90">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{factor}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500 italic">
                  No strong supporting factors recorded yet.
                </li>
              )}
            </ul>
          </div>

          {/* Opposing Factors / Contradictions List */}
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-1.5">
            <div className="text-[10px] font-bold text-rose-400 uppercase flex items-center justify-between">
              <span>Material Contradictions ({dossier?.opposingFactors.length || 0})</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300">
              {dossier?.opposingFactors && dossier.opposingFactors.length > 0 ? (
                dossier.opposingFactors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-rose-200/90">
                    <span className="text-rose-500 font-bold">⚠</span>
                    <span>{factor}</span>
                  </li>
                ))
              ) : (
                <li className="text-emerald-400/80 flex items-center gap-1.5">
                  <span>✓</span>
                  <span>Zero material contradictions active. Clean alignment.</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Longitudinal Snapshot Bar */}
        {snapshots && snapshots.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                <History className="w-3 h-3 text-cyan-400" />
                Longitudinal Window ({snapshots.length} observations • σ ={" "}
                {analytics?.scoreVariance || 0} pts)
              </span>
              <span className="text-slate-400 text-[10px]">
                Trend: <span className="text-cyan-400 font-bold">{analytics?.scoreTrend}</span> •
                Velocity:{" "}
                <span className="text-slate-200 font-bold">
                  {analytics?.scoreVelocity > 0
                    ? `+${analytics.scoreVelocity}`
                    : analytics?.scoreVelocity}{" "}
                  pts/10t
                </span>
              </span>
            </div>

            {/* Sparkline Bar Representation */}
            <div className="h-9 flex items-end gap-1 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
              {snapshots.map((s, idx) => {
                const heightPct = Math.min(100, Math.max(10, Math.round((s.score / 100) * 100)));
                const isCurrent = idx === snapshots.length - 1;
                return (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col justify-end group relative cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isCurrent
                          ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] ring-1 ring-white"
                          : s.score >= 70
                            ? "bg-emerald-500/80 hover:bg-emerald-400"
                            : s.score >= 58
                              ? "bg-cyan-600/80 hover:bg-cyan-500"
                              : "bg-slate-700 hover:bg-slate-600"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 pointer-events-none">
                      <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-slate-200 whitespace-nowrap shadow-xl">
                        Score: {s.score} | Danger: {s.dangerScore} | State: {s.state}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transition Events Log */}
        {transitions && transitions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase font-mono flex items-center justify-between">
              <span>Causal State Transition History</span>
              <span className="text-slate-500">{transitions.length} events logged</span>
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {transitions.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  className="p-2 rounded bg-slate-900/60 border border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {new Date(evt.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                      {evt.fromState} → {evt.toState}
                    </span>
                    <span className="text-slate-400 truncate max-w-[280px]">{evt.reason}</span>
                  </div>
                  <span className="text-slate-500 shrink-0 text-[9px]">
                    Score: {evt.scoreAtTransition} | Danger: {evt.dangerAtTransition}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
