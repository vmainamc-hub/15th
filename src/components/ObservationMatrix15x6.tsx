/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SUPPORTED_MARKETS } from "../lib/constants";
import {
  PROPOSITIONS_LIST,
  observationLayer,
  PropositionObservationState,
  ObservationState,
} from "../lib/sentinel/observation-layer";
import { ContractType } from "../types/sentinel";
import {
  Eye,
  Shield,
  Flame,
  CheckCircle2,
  Zap,
  Activity,
  AlertTriangle,
  AlertOctagon,
  Info,
  ChevronRight,
  X,
} from "lucide-react";
import { ObservationWindowPanel } from "./ObservationWindowPanel";

interface ObservationMatrix15x6Props {
  onSelectProposition?: (market: string, contract: ContractType) => void;
  selectedKey?: string | null;
}

export const ObservationMatrix15x6: React.FC<ObservationMatrix15x6Props> = ({
  onSelectProposition,
  selectedKey,
}) => {
  const [inspectedCell, setInspectedCell] = useState<{
    market: string;
    contract: ContractType;
  } | null>(null);

  const getBadgeForState = (state: ObservationState) => {
    switch (state) {
      case "RIPE":
        return {
          letter: "R",
          label: "RIPE",
          className:
            "bg-amber-500/30 text-amber-300 border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.4)] font-extrabold",
          icon: <Flame className="w-3 h-3 text-amber-400 inline mr-0.5" />,
        };
      case "EXECUTION_WINDOW":
        return {
          letter: "EX",
          label: "EXEC WINDOW",
          className: "bg-amber-500/35 text-amber-200 border-amber-400 font-extrabold",
          icon: <Flame className="w-3 h-3 text-amber-300 inline mr-0.5" />,
        };
      case "CONFIRMING":
        return {
          letter: "C",
          label: "CONFIRMING",
          className: "bg-emerald-500/25 text-emerald-300 border-emerald-500/60 font-bold",
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400 inline mr-0.5" />,
        };
      case "DEVELOPING":
        return {
          letter: "D",
          label: "DEVELOPING",
          className: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold",
          icon: <Zap className="w-3 h-3 text-cyan-400 inline mr-0.5" />,
        };
      case "FORMATION":
      case "INTERESTING":
        return {
          letter: "F",
          label: "FORMATION",
          className: "bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold",
          icon: <Activity className="w-3 h-3 text-blue-400 inline mr-0.5" />,
        };
      case "UNSTABLE":
        return {
          letter: "U",
          label: "UNSTABLE",
          className: "bg-rose-500/20 text-rose-300 border-rose-500/50",
          icon: <AlertTriangle className="w-3 h-3 text-rose-400 inline mr-0.5" />,
        };
      case "CONFLICT":
      case "ABANDONED":
        return {
          letter: "CF",
          label: "CONFLICT",
          className: "bg-purple-500/20 text-purple-300 border-purple-500/50",
          icon: <AlertOctagon className="w-3 h-3 text-purple-400 inline mr-0.5" />,
        };
      case "DECAYING":
        return {
          letter: "DC",
          label: "DECAYING",
          className: "bg-orange-500/20 text-orange-300 border-orange-500/50",
          icon: <AlertTriangle className="w-3 h-3 text-orange-400 inline mr-0.5" />,
        };
      case "EXPIRED":
      case "INVALIDATED":
        return {
          letter: "INV",
          label: state,
          className: "bg-slate-800 text-slate-400 border-slate-700",
          icon: <AlertTriangle className="w-3 h-3 text-slate-400 inline mr-0.5" />,
        };
      case "REJECTED":
      case "VETOED":
        return {
          letter: "V",
          label: "VETOED",
          className: "bg-red-950/60 text-red-400 border-red-800/80 opacity-60",
          icon: <AlertTriangle className="w-3 h-3 text-red-400 inline mr-0.5" />,
        };
      case "DORMANT":
      case "WATCHING":
      default:
        return {
          letter: "W",
          label: "WATCHING",
          className: "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200",
          icon: null,
        };
    }
  };

  const handleCellClick = (market: string, contract: ContractType) => {
    setInspectedCell({ market, contract });
    if (onSelectProposition) {
      onSelectProposition(market, contract);
    }
  };

  const selectedObservation = inspectedCell
    ? observationLayer.getPropositionObservation(inspectedCell.market, inspectedCell.contract)
    : null;

  return (
    <div className="space-y-4">
      {/* Overview Table */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                15-Market Observation Matrix (90 Cells)
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Independent continuous observation across all 15 Deriv indices & 6 propositions
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <span className="text-slate-500">Legend:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              W = WATCHING
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300">
              I = INTERESTING
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300">
              D = DEVELOPING
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
              C = CONFIRMING
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600 text-amber-300 font-bold animate-pulse">
              R = RIPE
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300">
              U = UNSTABLE
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800 text-purple-300">
              CF = CONFLICT
            </span>
          </div>
        </div>

        {/* 15 x 6 Matrix Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase bg-slate-900/40">
                <th className="py-2.5 px-3">Market / Instrument</th>
                <th className="py-2.5 px-3">Market State</th>
                {PROPOSITIONS_LIST.map((prop) => (
                  <th key={prop} className="py-2.5 px-2.5 text-center">
                    {prop.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {SUPPORTED_MARKETS.map((m) => {
                const marketObs = observationLayer.getMarketObservation(m.symbol);
                return (
                  <tr key={m.symbol} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]">{m.displayName}</span>
                        <span className="text-[9px] text-slate-500 font-mono">({m.symbol})</span>
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          marketObs?.marketStage === "STABLE_ACTIVE"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : marketObs?.marketStage === "HOSTILE"
                              ? "bg-rose-950 text-rose-400 border-rose-800"
                              : "bg-slate-900 text-slate-400 border-slate-800"
                        }`}
                      >
                        {marketObs?.marketStage || "COLD_START"}
                      </span>
                    </td>

                    {PROPOSITIONS_LIST.map((prop) => {
                      const obs = observationLayer.getPropositionObservation(m.symbol, prop);
                      const stage: ObservationState = obs?.currentStage || "WATCHING";
                      const badge = getBadgeForState(stage);
                      const isSelected =
                        inspectedCell?.market === m.symbol && inspectedCell?.contract === prop;

                      return (
                        <td key={prop} className="py-1.5 px-2 text-center">
                          <button
                            onClick={() => handleCellClick(m.symbol, prop)}
                            title={`${m.displayName} - ${prop}: ${stage} (${obs?.totalObservations || 0} ticks)`}
                            className={`w-full py-1 px-1 rounded-md border text-[11px] transition-all flex items-center justify-center gap-1 ${badge.className} ${
                              isSelected ? "ring-2 ring-cyan-400 shadow-md" : ""
                            }`}
                          >
                            {badge.icon}
                            <span>{badge.letter}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspected Cell Dossier Modal / Drawer */}
      {inspectedCell && selectedObservation && (
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Inspecting {selectedObservation.dossier.marketDisplayName} •{" "}
              {selectedObservation.contract.replace("_", " ")}
            </span>
            <button
              onClick={() => setInspectedCell(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 p-1 bg-slate-800 rounded"
            >
              <X className="w-3.5 h-3.5" /> Close Dossier
            </button>
          </div>
          <ObservationWindowPanel
            observationState={selectedObservation}
            marketObservation={observationLayer.getMarketObservation(inspectedCell.market)}
            marketSymbol={inspectedCell.market}
            contract={inspectedCell.contract}
          />
        </div>
      )}
    </div>
  );
};
