/**
 * SENTINEL — STAGE 4: FINAL DECISION (risk-integrated).
 *
 * Stage 3 answers "does the empirical digit distribution and touch evidence clear entry?".
 * Stage 4 answers "given everything we know about risk right now — account
 * state, statistical significance across ALL tested combinations, and
 * portfolio exposure — should this candidate actually be acted on, and at
 * what size?". It NEVER upgrades a Stage 3 verdict. It can only hold back,
 * downgrade, resize, or reorder what Stage 3 already produced, and every
 * change it makes is attributed.
 */

import {
  EntryVerdict,
  FinalVerdict,
  FinalDecision,
  OpportunityCandidate,
  SetupFactor,
  CircuitBreakerState,
  SignificanceAssessment,
  PortfolioExposureReport,
} from "../../types/sentinel";
import { SignificanceGuardEngine, ComboEvidence } from "../risk/significance-guard";
import { PositionSizingEngine } from "../risk/position-sizing";
import { PortfolioExposureEngine } from "../risk/portfolio-exposure";
import { CircuitBreakerEngine } from "../risk/circuit-breaker";

export class FinalDecisionEngine {
  /**
   * Applies Stage 4 Risk Integration to candidate opportunities.
   */
  public static evaluateStage4(
    candidates: OpportunityCandidate[],
    circuitBreaker: CircuitBreakerState,
    openPositions: { market: string; stake: number }[] = [],
  ): {
    ranked: OpportunityCandidate[];
    exposureReport: PortfolioExposureReport;
  } {
    // 1. Gather all active candidate combination evidences for Multiple-Testing Correction
    const comboEvidences: ComboEvidence[] = candidates.map((c) => {
      const sampleSize = Math.max(20, c.canonicalState.totalTicks || 100);
      const stdErr = Math.max(0.005, Math.sqrt(0.21 / sampleSize)); // approx variance for p~0.7
      const zScore = c.absoluteEdge / 100 / stdErr;
      const pVal = Math.max(0.0001, Math.min(0.9999, 1 - 0.5 * (1 + Math.tanh(zScore * 0.797885))));

      return {
        comboKey: c.id,
        pVal,
        rawWilsonLower: parseFloat((c.entryTrigger.wilsonLowerBound || 70).toFixed(2)),
        measuredEdge: c.absoluteEdge,
        sampleSize,
      };
    });

    const significanceMap = SignificanceGuardEngine.evaluateAll(comboEvidences);

    // 2. Attach Base & Drawdown Sizing and Initial Stage 4 Verdict to all candidates
    const evaluatedCandidates: OpportunityCandidate[] = candidates.map((cand) => {
      const factors: SetupFactor[] = [];

      // Determine Stage 3 Verdict
      let stage3Verdict: EntryVerdict = "WAIT";
      if (cand.signalState === "BLOCKED") {
        stage3Verdict = "BLOCKED";
      } else if (cand.signalState === "STRONG" || cand.signalState === "VALID") {
        stage3Verdict = "CLEARED";
      }

      factors.push({
        code: "STAGE_3_VERDICT",
        label: "Stage 3 Entry Clearance",
        points: stage3Verdict === "CLEARED" ? 100 : stage3Verdict === "WAIT" ? 50 : 0,
        measuredValue: stage3Verdict,
        detail: `Stage 3 produced ${stage3Verdict} clearance based on directional edge and touch dynamics.`,
      });

      // Calculate Sizing
      const empiricalWinRate = cand.survivalMetrics.run1WinRate || 75;
      const baseSizing = PositionSizingEngine.calculateBaseStake(
        cand.opportunityScore,
        cand.confidence,
        empiricalWinRate,
        1.38, // Typical Deriv payout for Over 2 / Under 7
        cand.canonicalState.totalTicks,
      );
      const sizingReport = PositionSizingEngine.applyDrawdownAdjustment(baseSizing, circuitBreaker);

      // Check Multiple Testing Significance
      const sigAssessment: SignificanceAssessment = significanceMap.get(cand.id) || {
        comboKey: cand.id,
        rawWilsonLower: 0.7,
        fdrAdjustedThreshold: 0.05,
        passesCorrection: cand.absoluteEdge >= 1.5,
        activeComparisons: candidates.length,
        detail: "Single candidate assessment.",
      };

      factors.push({
        code: "SIGNIFICANCE_GUARD",
        label: "Multiple Comparison FDR & MES",
        points: sigAssessment.passesCorrection ? 100 : 0,
        measuredValue: `passes=${sigAssessment.passesCorrection}`,
        detail: sigAssessment.detail,
      });

      // Determine Stage 4 Verdict
      let finalVerdict: FinalVerdict = stage3Verdict;
      let summary = "";

      if (circuitBreaker.tripped) {
        finalVerdict = "HELD_CIRCUIT_BREAKER";
        summary = `HELD BY CIRCUIT BREAKER: ${circuitBreaker.reason}`;
      } else if (stage3Verdict === "CLEARED" && !sigAssessment.passesCorrection) {
        finalVerdict = "HELD_UNCONFIRMED_SIGNIFICANCE";
        summary = `HELD BY SIGNIFICANCE GUARD: Failed Benjamini-Hochberg FDR / Minimum Effect Size gate.`;
      } else if (stage3Verdict === "CLEARED") {
        summary = `CLEARED: Passed empirical, touch, significance, and sizing gates. Stake: $${sizingReport.drawdownAdjustedStake.toFixed(2)}.`;
      } else {
        summary = `WAIT: Awaiting primary Stage 3 trigger clearance.`;
      }

      const finalDecision: FinalDecision = {
        verdict: finalVerdict,
        stage3Verdict,
        recommendedStake: sizingReport,
        significance: sigAssessment,
        exposure: null, // Populated after portfolio scan
        circuitBreaker,
        factors,
        summary,
      };

      return {
        ...cand,
        finalDecision,
        recommendedStake: sizingReport,
      };
    });

    // 3. Apply Portfolio Exposure Check and Correlation Group Ceilings without corrupting rank order
    const { report: exposureReport, heldCandidates } = PortfolioExposureEngine.evaluateExposure(
      evaluatedCandidates,
      openPositions,
    );

    const heldMap = new Map<string, string>();
    heldCandidates.forEach((h) => heldMap.set(h.candidate.id, h.reason));

    // Maintain true opportunity score descending rank order for all candidates
    const finalRanked: OpportunityCandidate[] = evaluatedCandidates.map((candidate) => {
      const heldReason = heldMap.get(candidate.id);
      if (heldReason && openPositions.length > 0) {
        const updatedDecision: FinalDecision = {
          ...candidate.finalDecision!,
          verdict: "HELD_EXPOSURE_CAP",
          exposure: exposureReport,
          summary: `HELD BY PORTFOLIO EXPOSURE: ${heldReason}`,
          factors: [
            ...candidate.finalDecision!.factors,
            {
              code: "EXPOSURE_CAP_BREACH",
              label: "Portfolio / Correlation Ceiling",
              points: 0,
              measuredValue: "BREACHED",
              detail: heldReason,
            },
          ],
        };
        return {
          ...candidate,
          finalDecision: updatedDecision,
        };
      }

      return {
        ...candidate,
        finalDecision: {
          ...candidate.finalDecision!,
          exposure: exposureReport,
        },
      };
    });

    // Re-verify strict score sort
    finalRanked.sort((a, b) => b.opportunityScore - a.opportunityScore);

    return {
      ranked: finalRanked,
      exposureReport,
    };
  }
}
