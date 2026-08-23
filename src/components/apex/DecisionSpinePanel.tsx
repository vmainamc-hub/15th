// SENTINEL DECISION SPINE — read-only presentation of the four ordered layers
// the ranking pipeline already computed:
//
//   STRUCTURE (1,000t)        owns direction
//   PRESSURE (15/30/60/120)   confirms or rejects it
//   VETO                      grants or refuses permission
//   SCORE                     structure scaled by the two gates
//
// Nothing is blended here. The operator sees the spine, not a percentage.
import type { RankedOpportunity } from "@/lib/apex/types";

const VETO_TONE: Record<string, string> = {
  ALLOW: "var(--bull)",
  CAUTION: "var(--warn)",
  SUPPRESS: "var(--bear)",
  VETO: "var(--bear)",
};

const PRESSURE_TONE: Record<string, string> = {
  CONFIRM: "var(--bull)",
  NEUTRAL: "var(--muted-foreground)",
  MIXED: "var(--warn)",
  REJECT: "var(--bear)",
};

function Row({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: string;
  detail: string;
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-t border-border/40 py-2 first:border-t-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div>
        <div className="font-mono text-[11px] font-bold tracking-[0.12em]" style={{ color: tone }}>
          {value}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export default function DecisionSpinePanel({ item }: { item: RankedOpportunity }) {
  const spine = item.spine;
  if (!spine) return null;

  const structure = spine.structure;
  const validation = spine.validation;
  const veto = spine.veto;
  const [structureLine, pressureLine, validationLine, vetoLine] = spine.lines;

  return (
    <section className="mt-5 rounded-lg border border-border/50 bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-mono text-[11px] font-bold tracking-[0.25em] text-[var(--neon)]">
          DECISION SPINE
        </h4>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: spine.tradeable ? "var(--bull)" : "var(--bear)" }}
        >
          {spine.tradeable ? "TRADEABLE" : "STAND DOWN"}
        </span>
      </div>

      <div className="mt-3">
        <Row
          label="Structure (1,000t)"
          value={`${structure.direction} · conviction ${structure.conviction}/100 · ${structure.change}`}
          tone={
            spine.contractAligned === false
              ? "var(--bear)"
              : structure.unusable
                ? "var(--warn)"
                : "var(--bull)"
          }
          detail={structureLine ?? structure.summary}
        />
        <Row
          label="Pressure 15/30/60/120"
          value={
            validation
              ? `${validation.verdict} · ${validation.support >= 0 ? "+" : ""}${validation.support} · ${validation.agreement} windows agree · ${validation.consensus}`
              : "NO DIRECTION TO VALIDATE"
          }
          tone={PRESSURE_TONE[validation?.verdict ?? "NEUTRAL"] ?? "var(--muted-foreground)"}
          detail={validationLine ?? pressureLine ?? "Pressure field not measurable yet."}
        />
        <Row
          label="Veto"
          value={veto.verdict}
          tone={VETO_TONE[veto.verdict] ?? "var(--muted-foreground)"}
          detail={vetoLine ?? veto.summary}
        />
        <Row
          label="Score"
          value={`${spine.score}/100 · ${spine.tradeable ? "tradeable" : "not tradeable"}`}
          tone={spine.tradeable ? "var(--bull)" : "var(--bear)"}
          detail={spine.headline}
        />
      </div>
    </section>
  );
}
