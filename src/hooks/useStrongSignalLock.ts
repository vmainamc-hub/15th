import { useState, useEffect, useRef, useCallback } from "react";
import { OpportunityCandidate } from "../types/sentinel";

export const MIN_SIGNAL_LOCK_DURATION_MS = 60_000; // 1 minute (60 seconds) minimum display stability hold

export interface StrongSignalLockState {
  lockedCandidate: OpportunityCandidate | null;
  isLocked: boolean;
  lockRemainingSeconds: number;
  lockProgressPercent: number;
  lockExpiresAt: number | null;
  manualOverride: boolean;
  releaseLock: () => void;
  lockCandidateManually: (candidate: OpportunityCandidate) => void;
  isScanningForStrong: boolean;
}

export function isCandidateTradeable(candidate: OpportunityCandidate): boolean {
  if (!candidate) return false;

  if (
    candidate.signalState === "BLOCKED" ||
    candidate.governance?.vetoed ||
    candidate.losingSide?.isHardBlocked
  ) {
    return false;
  }

  // 1. Check direct Quality Band
  const band =
    candidate.qualityBand ||
    candidate.observationState?.qualityBand ||
    candidate.observationState?.qualificationContract?.qualityBand;
  if (band === "OPPORTUNITY" || band === "BEST_SETUP" || band === "EXECUTION_QUALIFIED") {
    return true;
  }

  // 2. Check full Qualification Contract
  const contract =
    candidate.qualificationContract || candidate.observationState?.qualificationContract;
  if (
    contract &&
    (contract.allPassed ||
      contract.qualityBand === "OPPORTUNITY" ||
      contract.qualityBand === "BEST_SETUP")
  ) {
    return true;
  }

  // 3. Check active Execution Window Snapshot or Stage
  const obsStage = candidate.observationState?.currentStage;
  const execState = candidate.executionState;
  if (
    obsStage === "RIPE" ||
    obsStage === "EXECUTION_WINDOW" ||
    execState === "RIPE" ||
    execState === "EXECUTION_WINDOW_ACTIVE" ||
    (candidate.observationState?.snapshot &&
      Date.now() < candidate.observationState.snapshot.executionWindowExpiresAt)
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a candidate is specifically classified as BEST_SETUP.
 * BEST_SETUP is an enhanced quality classification (exceptional multi-pillar confluence).
 */
export function isCandidateBestSetup(candidate: OpportunityCandidate): boolean {
  if (!candidate) return false;

  if (
    candidate.signalState === "BLOCKED" ||
    candidate.governance?.vetoed ||
    candidate.losingSide?.isHardBlocked
  ) {
    return false;
  }

  const band =
    candidate.qualityBand ||
    candidate.observationState?.qualityBand ||
    candidate.observationState?.qualificationContract?.qualityBand;
  if (band === "BEST_SETUP") {
    return true;
  }

  const contract =
    candidate.qualificationContract || candidate.observationState?.qualificationContract;
  if (contract && contract.allPassed && (candidate.opportunityScore ?? 0) >= 82) {
    return true;
  }

  return false;
}

export function isCandidateStrong(candidate: OpportunityCandidate): boolean {
  return isCandidateTradeable(candidate);
}

/**
 * Hook: useStrongSignalLock
 *
 * BALANCED SELECTIVITY OPPORTUNITY ENGINE:
 * 1. Setups that achieve OPPORTUNITY or BEST_SETUP tier are promoted.
 * 2. BEST_SETUP candidates receive priority ranking, while genuinely qualified OPPORTUNITY signals are preserved.
 * 3. When an Opportunity or Best Setup qualifies, it is locked in the Pre-Trade Cockpit for its 90-second minimum execution window.
 * 4. Incomplete, developing, or vetoed setups remain in the Observation Area with explicit explanations.
 */
export function useStrongSignalLock(
  rankedCandidates: OpportunityCandidate[],
  selectedCandidate: OpportunityCandidate | null,
  onSelectCandidate?: (candidate: OpportunityCandidate | null) => void,
): StrongSignalLockState {
  const [lockedCandidateKey, setLockedCandidateKey] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState<number>(60);
  const [lockProgressPercent, setLockProgressPercent] = useState<number>(100);
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [activeLockedObj, setActiveLockedObj] = useState<OpportunityCandidate | null>(null);

  const lockExpiresAtRef = useRef<number | null>(null);
  lockExpiresAtRef.current = lockExpiresAt;

  const lockedCandidateKeyRef = useRef<string | null>(null);
  lockedCandidateKeyRef.current = lockedCandidateKey;

  const activeLockedObjRef = useRef<OpportunityCandidate | null>(null);
  activeLockedObjRef.current = activeLockedObj;

  const manualOverrideRef = useRef<boolean>(false);
  manualOverrideRef.current = manualOverride;

  // 1. Evaluate incoming candidates to enforce balanced selectivity opportunity lock
  useEffect(() => {
    if (manualOverrideRef.current) return;
    if (rankedCandidates.length === 0) {
      if (!manualOverrideRef.current) {
        setActiveLockedObj(null);
        setLockedCandidateKey(null);
      }
      return;
    }

    const now = Date.now();
    const isCurrentlyLocked = lockExpiresAtRef.current !== null && now < lockExpiresAtRef.current;

    // A) If an Opportunity candidate is already locked in its execution window:
    if (isCurrentlyLocked && lockedCandidateKeyRef.current) {
      const currentSnapshot = rankedCandidates.find((c) => c.id === lockedCandidateKeyRef.current);
      if (currentSnapshot) {
        // Invalidate lock immediately if hard veto or danger break occurred
        if (
          currentSnapshot.governance?.vetoed ||
          currentSnapshot.signalState === "BLOCKED" ||
          currentSnapshot.losingSide?.isHardBlocked
        ) {
          setLockedCandidateKey(null);
          setLockExpiresAt(null);
          setActiveLockedObj(null);
        } else {
          setActiveLockedObj(currentSnapshot);
        }
      }
      return;
    }

    // B) Filter genuine OPPORTUNITY / BEST_SETUP / EXECUTION_QUALIFIED candidates
    const qualifiedCandidates = rankedCandidates.filter((c) => isCandidateTradeable(c));

    // Prioritize BEST_SETUP first, then top OPPORTUNITY by score
    qualifiedCandidates.sort((a, b) => {
      const aIsBest = isCandidateBestSetup(a) ? 1 : 0;
      const bIsBest = isCandidateBestSetup(b) ? 1 : 0;
      if (aIsBest !== bIsBest) return bIsBest - aIsBest;
      return (b.opportunityScore || 0) - (a.opportunityScore || 0);
    });

    if (qualifiedCandidates.length > 0) {
      const topOpportunity = qualifiedCandidates[0];
      const validityWindowMs = (topOpportunity.validityWindowSeconds || 90) * 1000;
      const expiresAt = now + Math.max(MIN_SIGNAL_LOCK_DURATION_MS, validityWindowMs);

      setLockedCandidateKey(topOpportunity.id);
      setLockExpiresAt(expiresAt);
      setLockRemainingSeconds(Math.ceil((expiresAt - now) / 1000));
      setLockProgressPercent(100);
      setActiveLockedObj(topOpportunity);
    } else {
      // ZERO actionable opportunities when no setup passes qualification
      setLockedCandidateKey(null);
      setLockExpiresAt(null);
      setLockRemainingSeconds(0);
      setLockProgressPercent(0);
      setActiveLockedObj(null);
    }
  }, [rankedCandidates]);

  // 2. High-precision countdown timer for the lock
  useEffect(() => {
    if (!lockExpiresAt) {
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, lockExpiresAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const totalDuration = MIN_SIGNAL_LOCK_DURATION_MS;
      const percent = Math.min(100, Math.max(0, (remainingMs / totalDuration) * 100));

      setLockRemainingSeconds(remainingSec);
      setLockProgressPercent(percent);

      if (remainingMs <= 0) {
        // Lock period has finished — open up for re-evaluation on next scan
        setLockExpiresAt(null);
        setLockedCandidateKey(null);
        setActiveLockedObj(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [lockExpiresAt]);

  // 3. Resolve the active displayed candidate with zero flicker
  let displayedCandidate: OpportunityCandidate | null = null;

  if (manualOverride && selectedCandidate) {
    displayedCandidate = selectedCandidate;
  } else if (activeLockedObj && isCandidateBestSetup(activeLockedObj)) {
    displayedCandidate = activeLockedObj;
  } else if (lockedCandidateKey) {
    const matched = rankedCandidates.find((c) => c.id === lockedCandidateKey);
    if (matched && isCandidateBestSetup(matched)) {
      displayedCandidate = matched;
    }
  }

  // Manual release handler (resets the lock immediately)
  const releaseLock = useCallback(() => {
    setLockedCandidateKey(null);
    setLockExpiresAt(null);
    setLockRemainingSeconds(0);
    setLockProgressPercent(0);
    setManualOverride(false);
    setActiveLockedObj(null);
    if (onSelectCandidate) {
      onSelectCandidate(null);
    }
  }, [onSelectCandidate]);

  // Manual pin handler (operator manually inspects/locks a candidate for 60 seconds)
  const lockCandidateManually = useCallback(
    (cand: OpportunityCandidate) => {
      const now = Date.now();
      setLockedCandidateKey(cand.id);
      setLockExpiresAt(now + MIN_SIGNAL_LOCK_DURATION_MS);
      setLockRemainingSeconds(60);
      setLockProgressPercent(100);
      setActiveLockedObj(cand);
      setManualOverride(true);
      if (onSelectCandidate) {
        onSelectCandidate(cand);
      }
    },
    [onSelectCandidate],
  );

  const isLocked = lockExpiresAt !== null && Date.now() < lockExpiresAt;
  const isScanningForStrong = displayedCandidate === null;

  return {
    lockedCandidate: displayedCandidate,
    isLocked,
    lockRemainingSeconds,
    lockProgressPercent,
    lockExpiresAt,
    manualOverride,
    releaseLock,
    lockCandidateManually,
    isScanningForStrong,
  };
}
