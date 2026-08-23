import type { CellId } from "./constants";
import type { ObservationDossier, ObservationEvent, QualificationSnapshot } from "./types";
import type { ObservationPersistenceAdapter } from "./persistence";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_STORAGE_KEY = "apex.observation.persistence.v1";
const MAX_STORED_EVENTS = 200;

interface LocalStore {
  dossiers: Record<string, ObservationDossier>;
  events: Record<string, ObservationEvent[]>;
  qualifications: Record<string, QualificationSnapshot>;
  updatedAt: number;
}

export class SupabasePersistenceAdapter implements ObservationPersistenceAdapter {
  private memoryStore: LocalStore = {
    dossiers: {},
    events: {},
    qualifications: {},
    updatedAt: Date.now(),
  };
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          this.memoryStore = {
            dossiers: parsed.dossiers ?? {},
            events: parsed.events ?? {},
            qualifications: parsed.qualifications ?? {},
            updatedAt: parsed.updatedAt ?? Date.now(),
          };
        }
      }
    } catch {
      // Clean fallback if storage is corrupt
    }
  }

  private scheduleLocalSave() {
    if (typeof window === "undefined" || this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.memoryStore));
      } catch {
        // Handle storage quota gracefully
      }
    }, 1000);
  }

  async saveDossierSnapshot(dossier: ObservationDossier): Promise<void> {
    this.memoryStore.dossiers[dossier.cellId] = dossier;
    this.memoryStore.updatedAt = Date.now();
    this.scheduleLocalSave();

    // Asynchronously mirror high-value states (RIPE/CONFIRMING) to Supabase if authenticated
    if (dossier.state === "RIPE" || dossier.state === "CONFIRMING") {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user?.id) {
          await supabase.from("apex_market_state").upsert(
            {
              symbol: dossier.marketId,
              user_id: authData.user.id,
              kind: `obs_dossier_${dossier.cellId}`,
              model_version: 1,
              payload: dossier as unknown as Record<string, unknown>,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "symbol,kind,user_id" },
          );
        }
      } catch {
        // Non-blocking background sync
      }
    }
  }

  async appendEvent(cellId: CellId, event: ObservationEvent): Promise<void> {
    if (!this.memoryStore.events[cellId]) {
      this.memoryStore.events[cellId] = [];
    }
    const list = this.memoryStore.events[cellId];
    list.push(event);
    if (list.length > MAX_STORED_EVENTS) {
      list.splice(0, list.length - MAX_STORED_EVENTS);
    }
    this.memoryStore.updatedAt = Date.now();
    this.scheduleLocalSave();
  }

  async loadRecentEvents(cellId: CellId, limit = 50): Promise<ObservationEvent[]> {
    const list = this.memoryStore.events[cellId] ?? [];
    return list.slice(-limit);
  }

  async saveQualification(snapshot: QualificationSnapshot): Promise<void> {
    this.memoryStore.qualifications[snapshot.cellId] = snapshot;
    this.memoryStore.updatedAt = Date.now();
    this.scheduleLocalSave();

    // Mirror qualification snapshot to Supabase
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.id) {
        await supabase.from("apex_market_state").upsert(
          {
            symbol: snapshot.marketId,
            user_id: authData.user.id,
            kind: `obs_qual_${snapshot.cellId}`,
            model_version: 1,
            payload: snapshot as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "symbol,kind,user_id" },
        );
      }
    } catch {
      // Non-blocking sync
    }
  }

  async loadQualification(cellId: CellId): Promise<QualificationSnapshot | null> {
    return this.memoryStore.qualifications[cellId] ?? null;
  }
}
