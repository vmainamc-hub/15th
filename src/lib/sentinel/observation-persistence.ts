/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContractType } from "../../types/sentinel";

/**
 * Persisted live observation state (Table: `observation_state`)
 * Exactly 1 row per cell (90 rows across the 15 markets x 6 propositions).
 */
export interface PersistedObservationState {
  id: string; // `${market}__${contract}`
  market: string;
  contract: ContractType;
  current_state: string; // 'WATCHING' | 'INTERESTING' | 'DEVELOPING' | 'CONFIRMING' | 'RIPE' | 'UNSTABLE' | 'CONFLICT' | 'REJECTED'
  stability: string; // 'CALM' | 'STABLE' | 'DEVELOPING' | 'FLUCTUATING' | 'CHOPPY' | 'HIGHLY_UNSTABLE' | 'TRANSITIONING'
  observation_age_ticks: number;
  current_state_duration_ticks: number;
  score: number;
  danger_score: number;
  evidence_summary: string;
  contradiction_count: number;
  supporting_count: number;
  opposing_count: number;
  is_ripe: boolean;
  is_vetoed: boolean;
  hidden_behavior_summary: string;
  simulation_state: string;
  last_updated_epoch: number;
}

/**
 * Persisted transition event log (Table: `observation_event`)
 * Append-only log of longitudinal state changes.
 */
export interface PersistedObservationEvent {
  id: string;
  timestamp: number;
  market: string;
  contract: ContractType;
  from_state: string;
  to_state: string;
  reason: string;
  trigger_category: string;
  score_at_transition: number;
  danger_at_transition: number;
}

const STATE_STORAGE_KEY = "apex_sentinel_observation_state_v1";
const EVENT_STORAGE_KEY = "apex_sentinel_observation_event_v1";
const MAX_STORED_EVENTS = 500;

/**
 * ObservationPersistenceAdapter
 *
 * Manages the two dedicated observation tables (`observation_state` and `observation_event`)
 * ensuring clean separation from trade, feedback, and simulation databases.
 */
class ObservationPersistenceAdapter {
  private stateCache: Map<string, PersistedObservationState> = new Map();
  private eventLog: PersistedObservationEvent[] = [];
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const stateRaw = localStorage.getItem(STATE_STORAGE_KEY);
      if (stateRaw) {
        const list: PersistedObservationState[] = JSON.parse(stateRaw);
        list.forEach((row) => this.stateCache.set(row.id, row));
      }

      const eventRaw = localStorage.getItem(EVENT_STORAGE_KEY);
      if (eventRaw) {
        this.eventLog = JSON.parse(eventRaw);
      }
      this.isLoaded = true;
    } catch {
      // Fallback silently if storage is restricted
    }
  }

  /**
   * Upsert an observation_state row for a given market & proposition
   */
  public upsertState(state: PersistedObservationState): void {
    this.stateCache.set(state.id, { ...state, last_updated_epoch: Date.now() });
    this.persistStateDebounced();
  }

  /**
   * Append an observation_event row
   */
  public logEvent(event: Omit<PersistedObservationEvent, "id">): PersistedObservationEvent {
    const fullEvent: PersistedObservationEvent = {
      ...event,
      id: `obs_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    this.eventLog.unshift(fullEvent);
    if (this.eventLog.length > MAX_STORED_EVENTS) {
      this.eventLog.length = MAX_STORED_EVENTS;
    }

    this.persistEventsDebounced();
    return fullEvent;
  }

  /**
   * Get all live observation states
   */
  public getAllStates(): PersistedObservationState[] {
    return Array.from(this.stateCache.values());
  }

  /**
   * Get observation state for a specific cell
   */
  public getState(market: string, contract: ContractType): PersistedObservationState | null {
    const id = `${market}__${contract}`;
    return this.stateCache.get(id) || null;
  }

  /**
   * Get transition events for a specific cell or market
   */
  public getEvents(
    market?: string,
    contract?: ContractType,
    limit: number = 30,
  ): PersistedObservationEvent[] {
    return this.eventLog
      .filter((e) => (!market || e.market === market) && (!contract || e.contract === contract))
      .slice(0, limit);
  }

  private saveTimeout: any = null;
  private persistStateDebounced(): void {
    if (typeof window === "undefined") return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        const list = Array.from(this.stateCache.values());
        localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }, 500);
  }

  private eventSaveTimeout: any = null;
  private persistEventsDebounced(): void {
    if (typeof window === "undefined") return;
    if (this.eventSaveTimeout) clearTimeout(this.eventSaveTimeout);
    this.eventSaveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(this.eventLog));
      } catch {}
    }, 500);
  }
}

export const observationPersistence = new ObservationPersistenceAdapter();
