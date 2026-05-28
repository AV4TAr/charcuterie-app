"use client";

import { useTranslations } from "next-intl";

export type IngredientSnap = {
  ingredientId: string;
  name: string;
  mode: "percent" | "absolute";
  percentOfMeat: number | null;
  amountCanonical: number | null;
  displayUnit: string;
};

type DiffKind = "same" | "changed" | "added" | "removed";

type DiffRow = {
  name: string;
  kind: DiffKind;
  before: string | null;
  after: string | null;
};

function formatSnap(ing: IngredientSnap): string {
  if (ing.mode === "percent" && ing.percentOfMeat !== null) {
    return `${(ing.percentOfMeat * 100).toFixed(2)}%`;
  }
  if (ing.amountCanonical !== null) {
    const val = ing.amountCanonical % 1 === 0
      ? String(ing.amountCanonical)
      : ing.amountCanonical.toFixed(2);
    return `${val} ${ing.displayUnit}`;
  }
  return "—";
}

function buildDiff(from: IngredientSnap[], to: IngredientSnap[]): DiffRow[] {
  const fromMap = new Map(from.map((i) => [i.ingredientId, i]));
  const toMap = new Map(to.map((i) => [i.ingredientId, i]));
  const rows: DiffRow[] = [];

  for (const [id, toIng] of toMap) {
    const fromIng = fromMap.get(id);
    if (!fromIng) {
      rows.push({ name: toIng.name, kind: "added", before: null, after: formatSnap(toIng) });
    } else {
      const same =
        fromIng.mode === toIng.mode &&
        fromIng.percentOfMeat === toIng.percentOfMeat &&
        fromIng.amountCanonical === toIng.amountCanonical;
      rows.push({
        name: toIng.name,
        kind: same ? "same" : "changed",
        before: formatSnap(fromIng),
        after: formatSnap(toIng),
      });
    }
  }

  for (const [id, fromIng] of fromMap) {
    if (!toMap.has(id)) {
      rows.push({ name: fromIng.name, kind: "removed", before: formatSnap(fromIng), after: null });
    }
  }

  return rows.sort((a, b) => {
    const order: Record<DiffKind, number> = { changed: 0, added: 1, removed: 2, same: 3 };
    return order[a.kind] - order[b.kind];
  });
}

export function VersionDiff({
  fromLabel,
  toLabel,
  fromIngredients,
  toIngredients,
}: {
  fromLabel: string;
  toLabel: string;
  fromIngredients: IngredientSnap[];
  toIngredients: IngredientSnap[];
}) {
  const t = useTranslations("proposals");
  const diff = buildDiff(fromIngredients, toIngredients);
  const changed = diff.filter((d) => d.kind !== "same");
  const addedCount = diff.filter((d) => d.kind === "added").length;
  const removedCount = diff.filter((d) => d.kind === "removed").length;
  const changedCount = diff.filter((d) => d.kind === "changed").length;

  if (changed.length === 0) {
    return (
      <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {t("noChanges")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {fromLabel} <span style={{ color: "var(--ink)" }}>→</span> {toLabel}
        </span>
        {changedCount > 0 && (
          <span className="mono" style={{ fontSize: 10, color: "var(--warn)" }}>~{changedCount}</span>
        )}
        {addedCount > 0 && (
          <span className="mono" style={{ fontSize: 10, color: "var(--good)" }}>+{addedCount}</span>
        )}
        {removedCount > 0 && (
          <span className="mono" style={{ fontSize: 10, color: "var(--warn)" }}>-{removedCount}</span>
        )}
      </div>
      <div className="card" style={{ padding: 0, fontFamily: "var(--mono)", fontSize: 12 }}>
        {changed.map((d, i) => {
          const cfg =
            d.kind === "added"
              ? { sign: "+", color: "var(--good)", bg: "color-mix(in oklab, var(--good) 8%, var(--paper))" }
              : d.kind === "removed"
              ? { sign: "−", color: "var(--warn)", bg: "color-mix(in oklab, var(--warn) 8%, var(--paper))" }
              : { sign: "~", color: "var(--warn)", bg: "color-mix(in oklab, var(--warn) 6%, var(--paper))" };

          return (
            <div
              key={`${d.name}-${d.kind}`}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 90px 90px",
                background: cfg.bg,
                padding: "8px 0",
                borderTop: i ? "1px solid var(--rule-soft)" : "none",
              }}
            >
              <span style={{ textAlign: "center", color: cfg.color, fontWeight: 600 }}>{cfg.sign}</span>
              <span style={{ color: "var(--ink)" }}>{d.name}</span>
              <span style={{ color: "var(--ink-3)", textAlign: "right", paddingRight: 12 }}>
                {d.before ?? "—"}
              </span>
              <span style={{ color: cfg.color, textAlign: "right", paddingRight: 14, fontWeight: 500 }}>
                {d.after ?? "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
