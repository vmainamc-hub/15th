/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const FEATURE_FLAG_STORAGE_KEY = "sentinel_flag_enable_observation_layer_v1";

export const featureFlags = {
  /**
   * ENABLE_OBSERVATION_LAYER (Section 28)
   * Controls whether the stateful Observation Layer, Observation Window,
   * and 15-Market Matrix are rendered. Defaults to true.
   */
  isObservationLayerEnabled(): boolean {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(FEATURE_FLAG_STORAGE_KEY);
    if (stored === null) return true; // default on
    return stored === "true";
  },

  setObservationLayerEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(FEATURE_FLAG_STORAGE_KEY, enabled.toString());
  },
};
