# Sentinel Proposal — Wiring Guide

Everything in `src/lib/sentinel/proposal/` is **self-contained**: no imports from
the existing Sentinel tree, so it compiles as-is and can be wired incrementally.
Nothing in the existing app is modified by this folder.

## Files

| File                      | Role                                                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                | Layer contracts. `CanonicalStateLike` / `ContractShapeLike` are declared locally but are structurally compatible with `digit-psychology.ts`'s `CanonicalDigitState` / `ContractShape`. |
| `structural-direction.ts` | **Engine A** — 1,000-tick psychology, sole owner of direction. Emits `OVER \| UNDER \| CONFLICT \| UNKNOWN` + conviction, and enforces the hard blocks.                                |
| `pressure-windows.ts`     | **Engine B** — 15/30/60/120 nested-window pressure. Movement only.                                                                                                                     |
| `pressure-validator.ts`   | Engine B judges Engine A → `CONFIRM \| NEUTRAL \| MIXED \| REJECT`.                                                                                                                    |
| `veto-engine.ts`          | Gate layer → `ALLOW \| CAUTION \| SUPPRESS \| VETO`, with named auditable rule codes.                                                                                                  |
| `index.ts`                | `evaluateSentinelSpine()` — the whole spine in one pure call.                                                                                                                          |

## The architectural rule this enforces

```
1,000 TICKS  →  DIRECTION           (structure decides; nobody else votes on it)
15/30/60/120 →  CONFIRM / REJECT    (movement only; no GREEN/RED anywhere)
VETO ENGINE  →  PERMISSION          (gates, never votes)
ENTRY LAYER  →  TIMING              (unchanged)
```

## Step 1 — swap the local type declarations for the real ones (optional)

In `types.ts` replace the two `*Like` interfaces with:

```ts
export type { CanonicalDigitState as CanonicalStateLike } from "../digit-psychology";
export type { ContractShape as ContractShapeLike } from "../digit-psychology";
```

If `CanonicalDigitState` field names differ (e.g. `deltaPp` vs `delta`), adapt in
one place — a small mapper at the call site — rather than editing the engines.

## Step 2 — call the spine where the market snapshot is built

```ts
import { evaluateSentinelSpine } from "@/lib/sentinel/proposal";
import { canonicalDigitState } from "@/lib/sentinel/digit-psychology";

const canonical = canonicalDigitState(digits); // existing 1,000-tick layer
const spine = evaluateSentinelSpine({
  canonical,
  digits, // oldest → newest
  contract, // optional
  operator: { active: operatorVetoActive, reason }, // from global-veto.ts
});
```

`spine` gives you `direction`, `structure`, `pressure`, `validation`, `veto`,
`score`, `tradeable`, `headline`, `lines`.

## Step 3 — `direction.ts`: stop voting on direction

Currently `computeDirection()` blends `DIGIT_STATS`, `PRESSURE`, `TRANSITION`,
`PSYCHOLOGY`, `CROWD_GROUPS`, `MODEL`… into one averaged score. That is the
behaviour this proposal replaces.

Edits:

1. **Delete the `PSYCHOLOGY` vote** (`base: 0.16`) and the **`PRESSURE` vote**
   (`base: 0.18`). Direction now comes from `spine.structure.direction`; pressure
   is a gate, not a vote.
2. Add `spine` to the input type and short-circuit at the top:
   ```ts
   if (spine.structure.direction !== c.side) return againstReport(spine); // score 0-ish
   ```
   i.e. a contract whose side disagrees with structure can never score as a
   direction candidate.
3. Renormalise the remaining influences (`DIGIT_STATS`, `TRANSITION`,
   `CROWD_GROUPS`, `MODEL`, regime) — they now answer only _"how good is this
   contract given the direction?"_, never _"which direction?"_.
4. Multiply the final score by `spine.validation.modifier * spine.veto.modifier`,
   and surface `spine.validation.verdict` / `spine.veto.verdict` on
   `DirectionReport` as read-only display fields.

## Step 4 — `price-action-psychology.ts`: re-base onto four windows

Keep the file (contract alignment, takeover assessment, side pressure are used
elsewhere), but change its source of truth:

1. Add `PRICE_ACTION_IMMEDIATE = 15` and make the nest 15/30/60/120.
2. **Remove the structural term from the pressure formula.** Today:
   `pressureRaw = rate*7 + accel*4 + persistence*6 + clamp(pct − structural,−8,8)*1.2`.
   The last term lets the 1,000-tick distribution contaminate pressure. Drop it;
   carry the structural share as a display-only field
   (`structuralPctForDisplay`) exactly as `pressure-windows.ts` does.
3. Simplest path: make `computePriceActionField()` a thin adapter over
   `computePressureField()` and map `PressureReading → DigitPressureReading`, so
   there is one pressure implementation in the codebase, not two.

## Step 5 — `losing-side-pressure.ts`: take telemetry from Engine B

Today it derives `pressurePp` / `rising` from `ThreatReport`. Change the input so
its contributors come from the new field:

```ts
losingSidePressure(threat, spine.validation); // add the second argument
```

- `pressurePp` ← `field.digits[d].ratePp`
- `rising` ← `field.digits[d].ratePp > 0 && persistence >= 0.66`
- `risingCount` ← `spine.validation.losingClimbers.length`
- Keep the bounded modifier (`0.72..1.03`) and the `CLEAR/CAUTION/SUPPRESS`
  verdict exactly as they are — only the telemetry underneath changes, so
  existing tests keep their meaning.

## Step 6 — `global-veto.ts`: feed the new verdict in

`evaluateSignalGovernance()` stays the operator/learned-pattern authority. Wire
the two together instead of duplicating rules:

- Pass the operator result **into** the proposal:
  `operator: { active: governance.verdict === "VETOED", reason: governance.reason }`.
- Then take the worst of the two verdicts for display:
  `VETOED > SUPPRESS > ELEVATED_RISK/CAUTION > CLEAR`.
- Log `spine.veto.hits[].code` with the pattern outcome so
  `recordPatternOutcome()` can learn which gate actually predicted losses.

## Step 7 — `entry-trigger.ts` / `entry-clearance.ts`: gate the trigger

Add to `EntryTriggerInputs`:

```ts
structuralDirection: Side | null;
pressureVerdict: "CONFIRM" | "NEUTRAL" | "MIXED" | "REJECT";
vetoVerdict: "ALLOW" | "CAUTION" | "SUPPRESS" | "VETO";
```

Rules:

- `vetoVerdict === "VETO" | "SUPPRESS"` → trigger verdict `WAIT` (or `STAND_DOWN`),
  regardless of touch quality.
- `pressureVerdict === "REJECT"` → never `ENTER_NOW`.
- `pressureVerdict === "MIXED"` → cap the trigger at its second-best verdict.
- `pressureVerdict === "CONFIRM"` → the existing trigger logic is allowed to
  reach its strongest verdict.

## Step 8 — UI

Show four rows, in this order, so the operator sees the decision spine rather
than a blended percentage:

```
STRUCTURE (1,000t)   UNDER · conviction 68/100 · STABLE
PRESSURE (15/30/60/120)  CONFIRM · +42 · 4/4 windows agree
VETO                 ALLOW
SCORE                71/100 · tradeable
```

`spine.lines` is already ordered for exactly this.

## Testing notes

Every function is pure, so unit tests need no mocks:

- **Engine A** — synthesise a `CanonicalStateLike`; assert `UNDER` when GREEN is
  odd and RED is even, and assert `VETO`-level hard block when RED sits on the
  losing parity or on the excluded digit (1 for OVER, 8 for UNDER).
- **Engine B** — feed a stream where one digit's share climbs 120 → 60 → 30 → 15
  and assert `monotonicUp`, `4/4` agreement, `TAKING OVER`.
- **Validator** — same stream on the _losing_ parity of the structural direction
  and assert `REJECT`.
- **Veto engine** — assert the worst-verdict ladder and that
  `STRUCTURAL_HARD_BLOCK` / `LOSING_SIDE_TAKEOVER` are `nonNegotiable`.

## What deliberately did **not** change

- The canonical 1,000-tick window, its roles, and `contractPsychology()`'s
  winning/losing-zone logic — reused, not rewritten.
- The bounded losing-side modifier, learning, regime detection, calibration,
  execution-survival and stake sizing layers.
- The operator's hard rules: RED, 2ND RED, 2ND GREEN and MOST INCREASING on the
  losing side remain non-negotiable blocks.
