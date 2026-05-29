"use client";

import { useState, useTransition } from "react";
import { upsertPlanOverride, clearPlanOverride } from "@/app/actions/admin/set-override";

type Override = {
  plan: string | null;
  trialLimit: number | null;
  analysesLimit: number | null;
  importsLimit: number | null;
  chatDailyLimit: number | null;
  note: string | null;
};

export function OverrideForm({
  userId,
  initial,
}: {
  userId: string;
  initial: Override | null;
}) {
  const [plan, setPlan] = useState(initial?.plan ?? "");
  const [trialLimit, setTrialLimit] = useState(initial?.trialLimit?.toString() ?? "");
  const [analysesLimit, setAnalysesLimit] = useState(initial?.analysesLimit?.toString() ?? "");
  const [importsLimit, setImportsLimit] = useState(initial?.importsLimit?.toString() ?? "");
  const [chatDailyLimit, setChatDailyLimit] = useState(initial?.chatDailyLimit?.toString() ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertPlanOverride({
          userId,
          plan: plan || null,
          trialLimit: trialLimit === "" ? null : parseInt(trialLimit, 10),
          analysesLimit: analysesLimit === "" ? null : parseInt(analysesLimit, 10),
          importsLimit: importsLimit === "" ? null : parseInt(importsLimit, 10),
          chatDailyLimit: chatDailyLimit === "" ? null : parseInt(chatDailyLimit, 10),
          note: note || null,
        });
        setSavedAt(new Date());
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleClear() {
    if (!confirm("¿Borrar el override completo?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await clearPlanOverride(userId);
        setPlan("");
        setTrialLimit("");
        setAnalysesLimit("");
        setImportsLimit("");
        setChatDailyLimit("");
        setNote("");
        setSavedAt(new Date());
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
      <Field label="Plan forzado (free / plus / pro)" hint="Vacío = sin override; respeta la suscripción real">
        <input
          type="text"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="free | plus | pro"
          className="input"
        />
      </Field>
      <Field label="Trial limit" hint="Reemplaza el pool de 10 del Free. Vacío = default. -1 = ilimitado.">
        <input
          type="number"
          value={trialLimit}
          onChange={(e) => setTrialLimit(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Análisis por versión" hint="Vacío = default del plan. -1 = ilimitado.">
        <input
          type="number"
          value={analysesLimit}
          onChange={(e) => setAnalysesLimit(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Imports por versión" hint="Vacío = default del plan. -1 = ilimitado.">
        <input
          type="number"
          value={importsLimit}
          onChange={(e) => setImportsLimit(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Chat / día" hint="Vacío = default del plan. -1 = ilimitado.">
        <input
          type="number"
          value={chatDailyLimit}
          onChange={(e) => setChatDailyLimit(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Nota interna" hint="Razón del override. Visible solo en el panel admin.">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="input"
          style={{ resize: "vertical" }}
        />
      </Field>

      {error && (
        <p className="mono" style={{ fontSize: 12, color: "var(--bad)" }}>
          {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="mono" style={{ fontSize: 11, color: "var(--good)" }}>
          ✓ guardado {savedAt.toLocaleTimeString()}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="btn btn-primary"
        >
          {isPending ? "Guardando…" : "Guardar override"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="btn btn-ghost"
          >
            Borrar override
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{hint}</span>
      )}
    </label>
  );
}
