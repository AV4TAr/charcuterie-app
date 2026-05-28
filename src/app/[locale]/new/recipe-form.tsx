"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { toCanonical, toIngredientCanonical, unitsForType, unitLabel, MASS_UNITS, VOLUME_UNITS, type Unit, type MeasurementType } from "@/lib/units";
import { NewIngredientDialog, type NewIngredient } from "@/components/recipe/new-ingredient-dialog";
import ReactMarkdown from "react-markdown";
import { DonMarcoDisclaimerContent, DISCLAIMER_FOOTER } from "@/components/don-marco-disclaimer";

type DbIngredient = {
  id: string;
  name: string;
  name_es: string | null;
  name_en: string | null;
  measurement_type: MeasurementType;
  default_density_g_per_ml: number | null;
  category: string;
};

function displayName(ing: DbIngredient, locale: string): string {
  if (locale === "en") return ing.name_en ?? ing.name;
  return ing.name_es ?? ing.name;
}

type Row = {
  ingredientId: string;
  mode: "percent" | "absolute";
  value: string;
  displayUnit: string;
  scaleWithMeat: boolean;
};

export type RecipeFormValues = {
  title: string;
  description: string;
  visibility: "public" | "private";
  meatBaseValue: string;
  meatBaseUnit: "g" | "kg" | "oz" | "lb";
  changeNote: string;
  instructions: string;
  rows: Row[];
};

export type EditingContext = {
  recipeId: string;
  currentVersionNumber: number;
};

type ParsedIngredient = {
  name: string;
  amount: number;
  unit: string;
  matchedId: string | null;
  matchedName: string | null;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function matchIngredient(name: string, catalog: DbIngredient[]): DbIngredient | null {
  const q = name.toLowerCase().trim();
  const names = (i: DbIngredient) => [i.name, i.name_es, i.name_en].filter(Boolean).map((n) => n!.toLowerCase().trim());
  const exact = catalog.find((i) => names(i).includes(q));
  if (exact) return exact;
  const contains = catalog.find((i) => names(i).some((n) => n.includes(q) || q.includes(n)));
  return contains ?? null;
}

function inferMeasurementType(unit: string): "mass" | "volume" | "length" | "count" {
  if (["g", "kg", "oz", "lb"].includes(unit)) return "mass";
  if (["ml", "l", "floz", "tsp", "tbsp", "cup"].includes(unit)) return "volume";
  if (["cm", "m"].includes(unit)) return "length";
  return "count";
}

// ─── Ingredient combobox ────────────────────────────────────────────────────

function IngredientCombobox({
  value,
  onChange,
  catalog,
  onCreateNew,
  placeholder,
  locale,
}: {
  value: string;
  onChange: (id: string) => void;
  catalog: DbIngredient[];
  onCreateNew: () => void;
  placeholder: string;
  locale: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = catalog.find((i) => i.id === value);
  const filtered = query.length > 0
    ? catalog.filter((i) => {
        const q = query.toLowerCase();
        return [i.name, i.name_es, i.name_en].some((n) => n?.toLowerCase().includes(q));
      })
    : catalog;

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        type="text"
        className="input-lab"
        autoComplete="off"
        placeholder={placeholder}
        value={open ? query : (selected ? displayName(selected, locale) : "")}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%" }}
      />
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 2px)",
          left: 0,
          right: 0,
          zIndex: 50,
          background: "var(--paper)",
          border: "1px solid var(--rule)",
          borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          maxHeight: 220,
          overflowY: "auto",
        }}>
          {filtered.map((ing) => (
            <button
              key={ing.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(ing.id);
                setOpen(false);
                setQuery("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--ink)",
                background: ing.id === value ? "var(--bg-2)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {displayName(ing, locale)}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
              Sin resultados
            </div>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              onCreateNew();
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              fontSize: 12,
              color: "var(--accent)",
              background: "var(--bg-2)",
              border: "none",
              borderTop: "1px solid var(--rule)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + {query ? `Crear "${query}"` : "Nuevo ingrediente"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AI import panel ────────────────────────────────────────────────────────

function AIImportPanel({
  catalog,
  onAdd,
  onClose,
  locale,
}: {
  catalog: DbIngredient[];
  onAdd: (rows: Row[]) => void;
  onClose: () => void;
  locale: string;
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ParsedIngredient[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEs = locale !== "en";

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/parse-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 402) {
        setError(isEs ? "Necesitás configurar tu clave de Anthropic en Ajustes." : "Add your Anthropic API key in Settings.");
        return;
      }
      if (!res.ok) {
        setError(isEs ? "Error al interpretar. Intentá de nuevo." : "Parse error. Try again.");
        return;
      }
      const parsed = await res.json() as { name: string; amount: number; unit: string }[];
      const mapped: ParsedIngredient[] = parsed.map((p) => {
        const match = matchIngredient(p.name, catalog);
        return { ...p, matchedId: match?.id ?? null, matchedName: match?.name ?? null };
      });
      setPreview(mapped);
    } catch {
      setError(isEs ? "Error de red. Intentá de nuevo." : "Network error. Try again.");
    } finally {
      setParsing(false);
    }
  }

  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!preview) return;
    setAdding(true);
    const supabase = createClient();
    const newRows: Row[] = [];
    for (const p of preview) {
      let id = p.matchedId;
      if (!id) {
        const measurementType = inferMeasurementType(p.unit);
        let name_es: string | null = null;
        let name_en: string | null = null;
        try {
          const tRes = await fetch("/api/translate-ingredient", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: p.name }),
          });
          if (tRes.ok) {
            const t = await tRes.json() as { name_es: string; name_en: string };
            name_es = t.name_es;
            name_en = t.name_en;
          }
        } catch { /* translation is non-blocking */ }
        const { data } = await supabase
          .from("ingredients")
          .insert({ name: p.name, name_es, name_en, category: "other", measurement_type: measurementType })
          .select("id")
          .single();
        if (data) id = data.id;
      }
      if (id) {
        newRows.push({ ingredientId: id, mode: "absolute", value: String(p.amount), displayUnit: p.unit, scaleWithMeat: true });
      }
    }
    setAdding(false);
    onAdd(newRows);
    onClose();
  }

  const matchedCount = preview?.filter((p) => p.matchedId).length ?? 0;
  const unmatchedCount = preview?.filter((p) => !p.matchedId).length ?? 0;
  const totalCount = matchedCount + unmatchedCount;

  return (
    <div style={{
      border: "1px solid var(--rule)",
      borderRadius: 8,
      background: "var(--bg-2)",
      padding: 16,
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className="tag tag-accent" style={{ fontSize: 9 }}>✦ IA</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          {isEs ? "Importar ingredientes con IA" : "Import ingredients with AI"}
        </span>
        <button type="button" onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 16 }}>×</button>
      </div>

      {!preview ? (
        <>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8, lineHeight: 1.5 }}>
            {isEs
              ? "Pegá tu lista de ingredientes (uno por línea). Don Marco interpreta cantidades y unidades."
              : "Paste your ingredient list (one per line). Don Marco interprets amounts and units."}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isEs
              ? "Ej:\n2 cdas sal fina\n1.5 cdas pimentón dulce\n0.5 cdas ajo en polvo\n5 m tripa natural"
              : "e.g.:\n2 tbsp fine salt\n1.5 tbsp sweet paprika\n0.5 tbsp garlic powder\n5 m natural casing"}
            rows={6}
            className="textarea-lab"
            style={{ marginBottom: 10, fontFamily: "var(--mono)", fontSize: 12 }}
          />
          {error && <p style={{ fontSize: 12, color: "var(--warn)", marginBottom: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleParse}
              disabled={parsing || !text.trim()}
              className="btn btn-sm btn-primary"
            >
              {parsing ? (isEs ? "Interpretando…" : "Parsing…") : (isEs ? "Interpretar" : "Parse")}
            </button>
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
              {isEs ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </>
      ) : (
        <>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", marginBottom: 10 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--rule)" }}>
                <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--ink-3)", fontWeight: 500 }}>
                  {isEs ? "Ingrediente" : "Ingredient"}
                </th>
                <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--ink-3)", fontWeight: 500 }}>
                  {isEs ? "Cantidad" : "Amount"}
                </th>
                <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--ink-3)", fontWeight: 500 }}>
                  {isEs ? "Unidad" : "Unit"}
                </th>
                <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--ink-3)", fontWeight: 500 }}>
                  {isEs ? "Match" : "Match"}
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--rule-soft)" }}>
                  <td style={{ padding: "5px 8px", color: "var(--ink)" }}>{p.name}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--ink)" }}>{p.amount}</td>
                  <td style={{ padding: "5px 8px", fontFamily: "var(--mono)", color: "var(--ink)" }}>{unitLabel(p.unit as Unit, isEs ? "es" : "en", "short")}</td>
                  <td style={{ padding: "5px 8px" }}>
                    {p.matchedId ? (
                      <span style={{ color: "var(--good)", fontFamily: "var(--mono)", fontSize: 11 }}>✓ {p.matchedName}</span>
                    ) : (
                      <span style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 11 }}>
                        ✦ {isEs ? "nuevo" : "new"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {unmatchedCount > 0 && (
            <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8, fontFamily: "var(--mono)" }}>
              {isEs
                ? `${unmatchedCount} ingrediente${unmatchedCount > 1 ? "s" : ""} nuevo${unmatchedCount > 1 ? "s" : ""} — se van a crear en el catálogo.`
                : `${unmatchedCount} new ingredient${unmatchedCount > 1 ? "s" : ""} — will be added to the catalog.`}
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={totalCount === 0 || adding}
              className="btn btn-sm btn-primary"
            >
              {adding
                ? (isEs ? "Agregando…" : "Adding…")
                : (isEs ? `Agregar ${totalCount} ingrediente${totalCount !== 1 ? "s" : ""}` : `Add ${totalCount} ingredient${totalCount !== 1 ? "s" : ""}`)}
            </button>
            <button type="button" onClick={() => setPreview(null)} className="btn btn-sm btn-ghost">
              {isEs ? "← Editar texto" : "← Edit text"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Don Marco analysis drawer ──────────────────────────────────────────────

type AnalyzePayload = {
  title: string;
  meatBaseValue: number;
  meatBaseUnit: string;
  ingredients: { name: string; mode: string; value: number; unit: string }[];
};

type ChatMessage = { role: "user" | "assistant"; content: string };

async function streamSSE(
  res: Response,
  onChunk: (text: string) => void,
): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          accumulated += event.delta.text;
          onChunk(accumulated);
        }
      } catch { /* skip malformed */ }
    }
  }
  return accumulated;
}

function DonMarcoDrawer({
  open,
  onClose,
  getPayload,
  locale,
  hasAccepted: initialAccepted,
}: {
  open: boolean;
  onClose: () => void;
  getPayload: () => AnalyzePayload;
  locale: string;
  hasAccepted: boolean;
}) {
  const [accepted, setAccepted] = useState(initialAccepted);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isEs = locale !== "en";

  function scrollToBottom() {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => { scrollToBottom(); }, [messages, streamingText]);

  async function analyze() {
    setBusy(true);
    setMessages([]);
    setStreamingText("");
    setError(null);
    try {
      const res = await fetch("/api/analyze-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe: getPayload() }),
      });
      if (res.status === 402) {
        setError(isEs ? "Configurá tu clave de Anthropic en Ajustes." : "Add your Anthropic API key in Settings.");
        return;
      }
      if (!res.ok) {
        setError(isEs ? "Error al analizar. Intentá de nuevo." : "Analysis failed. Try again.");
        return;
      }
      const final = await streamSSE(res, (t) => { setStreamingText(t); });
      setMessages([{ role: "assistant", content: final }]);
      setStreamingText("");
    } catch {
      setError(isEs ? "Error de red." : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setBusy(true);
    setStreamingText("");
    try {
      const res = await fetch("/api/recipe-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe: getPayload(), messages: nextMessages }),
      });
      if (res.status === 402) {
        setError(isEs ? "Configurá tu clave de Anthropic en Ajustes." : "Add your Anthropic API key in Settings.");
        return;
      }
      if (!res.ok) {
        setError(isEs ? "Error. Intentá de nuevo." : "Error. Try again.");
        return;
      }
      const final = await streamSSE(res, (t) => { setStreamingText(t); });
      setMessages([...nextMessages, { role: "assistant", content: final }]);
      setStreamingText("");
    } catch {
      setError(isEs ? "Error de red." : "Network error.");
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  // Auto-analyze when drawer opens (only if disclaimer was accepted)
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current && accepted) analyze();
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accepted]);

  if (!open) return null;

  const analysisComplete = messages.length > 0 && !busy;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.3)" }}
      />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
        width: "min(480px, 100vw)",
        background: "var(--paper)",
        borderLeft: "1px solid var(--rule)",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--rule)",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 999,
            background: "var(--accent)", color: "var(--paper)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", flexShrink: 0,
          }}>M</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Don Marco</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {isEs ? "análisis de receta" : "recipe analysis"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {!busy && messages.length > 0 && (
              <button
                type="button"
                onClick={analyze}
                className="btn btn-sm btn-ghost"
                style={{ fontSize: 11 }}
              >
                {isEs ? "↺ Re-analizar" : "↺ Re-analyze"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 16, padding: "0 8px" }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Chat body */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {!accepted && (
            <DonMarcoDisclaimerContent
              locale={locale}
              onAccepted={() => { setAccepted(true); analyze(); }}
            />
          )}
          {accepted && error && (
            <p style={{ fontSize: 13, color: "var(--warn)", fontFamily: "var(--mono)", margin: 0 }}>{error}</p>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              flexDirection: m.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-start", gap: 10,
            }}>
              {m.role === "assistant" && (
                <span style={{
                  width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                  background: "var(--accent)", color: "var(--paper)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic",
                }}>M</span>
              )}
              <div style={{
                maxWidth: "80%",
                background: m.role === "user" ? "var(--accent)" : "var(--bg-2)",
                color: m.role === "user" ? "var(--paper)" : "var(--ink)",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                padding: "10px 14px",
                fontSize: 13, lineHeight: 1.65,
              }}>
                {m.role === "assistant"
                  ? <ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>, strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong> }}>{m.content}</ReactMarkdown>
                  : m.content}
              </div>
            </div>
          ))}

          {/* Streaming bubble */}
          {(busy && (streamingText || messages.length === 0)) && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                background: "var(--accent)", color: "var(--paper)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic",
              }}>M</span>
              <div style={{
                maxWidth: "80%",
                background: "var(--bg-2)",
                borderRadius: "4px 16px 16px 16px",
                padding: "10px 14px",
                fontSize: 13, lineHeight: 1.65,
                color: "var(--ink)",
              }}>
                {streamingText
                  ? <><ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>, strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong> }}>{streamingText}</ReactMarkdown><span style={{ opacity: 0.4 }}>▍</span></>
                  : <span className="mono" style={{ color: "var(--ink-3)" }}>● ● ●</span>
                }
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Chat input — only after analysis */}
        {accepted && analysisComplete && (
          <div style={{ borderTop: "1px solid var(--rule)", padding: "12px 16px 8px", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder={isEs ? "Hacé tu pregunta…" : "Ask a question…"}
                rows={1}
                disabled={busy}
                className="textarea-lab"
                style={{ flex: 1, resize: "none", fontSize: 13, minHeight: 36, maxHeight: 120 }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={busy || !input.trim()}
                className="btn btn-sm btn-primary"
                style={{ flexShrink: 0 }}
              >
                {isEs ? "Enviar" : "Send"}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: "var(--ink-3)", lineHeight: 1.4, fontFamily: "var(--mono)" }}>
              {DISCLAIMER_FOOTER[isEs ? "es" : "en"]}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main form ──────────────────────────────────────────────────────────────

const EMPTY_DEFAULTS: RecipeFormValues = {
  title: "",
  description: "",
  visibility: "private",
  meatBaseValue: "1",
  meatBaseUnit: "kg",
  changeNote: "",
  instructions: "",
  rows: [],
};

export function RecipeForm({
  locale,
  ingredients,
  userId,
  editing,
  initialValues,
  hasAcceptedDisclaimer,
}: {
  locale: string;
  ingredients: DbIngredient[];
  userId: string;
  editing?: EditingContext;
  initialValues?: Partial<RecipeFormValues>;
  hasAcceptedDisclaimer?: boolean;
}) {
  const t = useTranslations("recipe");
  const tUnits = useTranslations("units");
  const router = useRouter();
  const [saveError, setSaveError] = useState("");
  const [catalog, setCatalog] = useState<DbIngredient[]>(ingredients);
  const [dialogRowIndex, setDialogRowIndex] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isEditing = !!editing;

  const firstIng = catalog[0];
  const defaultUnit = firstIng ? unitsForType(firstIng.measurement_type)[0] : "g";

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<RecipeFormValues>({
      defaultValues: { ...EMPTY_DEFAULTS, ...initialValues, changeNote: isEditing ? "" : (initialValues?.changeNote ?? "") },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

  function getIngredient(id: string) {
    return catalog.find((i) => i.id === id);
  }

  function handleIngredientCreated(ing: NewIngredient) {
    const updated: DbIngredient = {
      id: ing.id,
      name: ing.name,
      name_es: null,
      name_en: null,
      measurement_type: ing.measurement_type,
      default_density_g_per_ml: ing.default_density_g_per_ml,
      category: ing.category,
    };
    setCatalog((prev) => [...prev, updated].sort((a, b) => a.name.localeCompare(b.name)));
    if (dialogRowIndex !== null) {
      setValue(`rows.${dialogRowIndex}.ingredientId`, ing.id);
      setValue(`rows.${dialogRowIndex}.displayUnit`, unitsForType(ing.measurement_type)[0]);
    }
    setDialogRowIndex(null);
  }

  function addRow() {
    append({
      ingredientId: firstIng?.id ?? "",
      mode: "percent",
      value: "1",
      displayUnit: defaultUnit,
      scaleWithMeat: true,
    });
  }

  function handleImportAdd(newRows: Row[]) {
    newRows.forEach((r) => append(r));
  }

  function getAnalyzePayload(): AnalyzePayload {
    const values = watch();
    return {
      title: values.title || (isEditing ? "Receta" : "Sin título"),
      meatBaseValue: Number(values.meatBaseValue) || 1,
      meatBaseUnit: values.meatBaseUnit,
      ingredients: (values.rows ?? []).map((r) => ({
        name: getIngredient(r.ingredientId)?.name ?? "?",
        mode: r.mode,
        value: Number(r.value),
        unit: r.displayUnit,
      })),
    };
  }

  async function onSubmit(values: RecipeFormValues) {
    setSaveError("");
    const supabase = createClient();

    let recipeId: string;
    let nextVersionNumber: number;

    if (isEditing && editing) {
      const { error: updateErr } = await supabase
        .from("recipes")
        .update({
          title: values.title.trim(),
          description: values.description.trim() || null,
          visibility: values.visibility,
        })
        .eq("id", editing.recipeId)
        .eq("owner_id", userId);

      if (updateErr) {
        setSaveError(updateErr.message);
        return;
      }
      recipeId = editing.recipeId;
      nextVersionNumber = editing.currentVersionNumber + 1;
    } else {
      const slug = slugify(values.title) + "-" + Math.random().toString(36).slice(2, 6);
      const { data: recipe, error: recipeErr } = await supabase
        .from("recipes")
        .insert({
          owner_id: userId,
          slug,
          title: values.title.trim(),
          description: values.description.trim() || null,
          visibility: values.visibility,
        })
        .select("id")
        .single();

      if (recipeErr || !recipe) {
        setSaveError(recipeErr?.message ?? "Failed to create recipe");
        return;
      }
      recipeId = recipe.id;
      nextVersionNumber = 1;
    }

    const meatGrams = toCanonical(Number(values.meatBaseValue) || 1000, values.meatBaseUnit);
    const { data: version, error: versionErr } = await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: recipeId,
        version_number: nextVersionNumber,
        change_note: values.changeNote.trim() || null,
        instructions: values.instructions.trim() || null,
        meat_base_weight_grams: meatGrams,
        meat_base_display_unit: values.meatBaseUnit,
        created_by: userId,
      })
      .select("id")
      .single();

    if (versionErr || !version) {
      setSaveError(versionErr?.message ?? "Failed to create version");
      return;
    }

    await supabase.from("recipes").update({ current_version_id: version.id }).eq("id", recipeId);

    const validRows = values.rows.filter((r) => r.ingredientId && Number(r.value) > 0);
    if (validRows.length > 0) {
      const ingredientRows = validRows.map((r, i) => {
        const val = Number(r.value);
        const ing = getIngredient(r.ingredientId);
        const common = {
          version_id: version.id,
          ingredient_id: r.ingredientId,
          display_unit: r.displayUnit,
          sort_order: i,
          scale_with_meat: r.scaleWithMeat,
        };
        if (r.mode === "percent") {
          return { ...common, mode: "percent" as const, percent_of_meat: val / 100, amount_canonical: null };
        }
        const canonical = ing
          ? toIngredientCanonical(val, r.displayUnit as Unit, ing.measurement_type, ing.default_density_g_per_ml)
          : toCanonical(val, r.displayUnit as Unit);
        return {
          ...common,
          mode: "absolute" as const,
          amount_canonical: canonical,
          percent_of_meat: null,
        };
      });

      const { error: ingErr } = await supabase.from("recipe_version_ingredients").insert(ingredientRows);
      if (ingErr) {
        setSaveError(ingErr.message);
        return;
      }
    }

    router.push(`/r/${recipeId}`);
    router.refresh();
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="label-lab" htmlFor="title">{t("title")} *</label>
        <input
          id="title"
          {...register("title", { required: true })}
          placeholder={t("titlePlaceholder")}
          className={`input-lab${errors.title ? " err" : ""}`}
        />
      </div>

      <div>
        <label className="label-lab" htmlFor="description">{t("description")}</label>
        <textarea
          id="description"
          {...register("description")}
          placeholder={t("descriptionPlaceholder")}
          rows={2}
          className="textarea-lab"
        />
      </div>

      <div className="flex gap-6 flex-wrap">
        <div>
          <label className="label-lab" htmlFor="visibility">{t("visibility")}</label>
          <select id="visibility" {...register("visibility")} className="select-lab" style={{ width: 144 }}>
            <option value="private">{t("private")}</option>
            <option value="public">{t("public")}</option>
          </select>
        </div>
        <div>
          <label className="label-lab">{t("meatBase")}</label>
          <div className="flex gap-2">
            <input type="number" step="0.001" min="0.001" {...register("meatBaseValue")} className="input-lab" style={{ width: 96 }} />
            <select {...register("meatBaseUnit")} className="select-lab" style={{ width: 80 }}>
              {MASS_UNITS.map((u) => <option key={u} value={u}>{unitLabel(u, locale as "es" | "en", "short")}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="label-lab" style={{ margin: 0 }}>{t("ingredients")}</span>
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="btn btn-sm btn-ghost"
            style={{ fontSize: 11, color: "var(--accent)", marginLeft: "auto" }}
          >
            ✦ {locale === "en" ? "Import with AI" : "Importar con IA"}
          </button>
        </div>

        {showImport && (
          <AIImportPanel
            catalog={catalog}
            onAdd={handleImportAdd}
            onClose={() => setShowImport(false)}
            locale={locale}
          />
        )}

        {fields.map((field, index) => {
          const row = rows[index];
          const ing = row ? getIngredient(row.ingredientId) : null;
          const mode = row?.mode ?? "percent";

          return (
            <div
              key={field.id}
              className="flex flex-wrap gap-2 items-end p-3 rounded"
              style={{ border: "1px solid var(--rule)", background: "var(--bg-2)" }}
            >
              <div className="flex-1 min-w-[160px]">
                <span className="label-lab">{t("selectIngredient")}</span>
                <Controller
                  control={control}
                  name={`rows.${index}.ingredientId`}
                  render={({ field: f }) => (
                    <IngredientCombobox
                      value={f.value}
                      onChange={(id) => {
                        f.onChange(id);
                        const ing2 = getIngredient(id);
                        if (ing2 && rows[index]?.mode === "percent") {
                          setValue(`rows.${index}.displayUnit`, unitsForType(ing2.measurement_type)[0]);
                        }
                      }}
                      catalog={catalog}
                      onCreateNew={() => setDialogRowIndex(index)}
                      placeholder={t("selectIngredient")}
                      locale={locale}
                    />
                  )}
                />
              </div>

              <div>
                <span className="label-lab">{t("mode")}</span>
                <Controller
                  control={control}
                  name={`rows.${index}.mode`}
                  render={({ field: f }) => (
                    <select
                      {...f}
                      className="select-lab"
                      style={{ width: 128 }}
                      onChange={(e) => {
                        f.onChange(e);
                        if (e.target.value === "percent" && ing) {
                          setValue(`rows.${index}.displayUnit`, unitsForType(ing.measurement_type)[0]);
                        }
                      }}
                    >
                      <option value="percent">{t("percentMode")}</option>
                      <option value="absolute">{t("absoluteMode")}</option>
                    </select>
                  )}
                />
              </div>

              <div style={{ width: 80 }}>
                <span className="label-lab">{t("value")}</span>
                <input type="number" step="0.01" min="0" {...register(`rows.${index}.value`)} className="input-lab" />
              </div>

              <div>
                <span className="label-lab">{t("unit")}</span>
                <select {...register(`rows.${index}.displayUnit`)} className="select-lab" style={{ width: 96 }}>
                  {ing ? (
                    (() => {
                      const sameType = unitsForType(ing.measurement_type);
                      const hasDensity = !!(ing.default_density_g_per_ml && ing.default_density_g_per_ml > 0);
                      const crossType =
                        hasDensity && ing.measurement_type === "mass"
                          ? VOLUME_UNITS
                          : hasDensity && ing.measurement_type === "volume"
                          ? MASS_UNITS
                          : [];
                      return (
                        <>
                          <optgroup label={tUnits(ing.measurement_type)}>
                            {sameType.map((u) => <option key={u} value={u}>{unitLabel(u, locale as "es" | "en", "short")}</option>)}
                          </optgroup>
                          {crossType.length > 0 && (
                            <optgroup label={tUnits(ing.measurement_type === "mass" ? "volume" : "mass")}>
                              {crossType.map((u) => <option key={u} value={u}>{unitLabel(u, locale as "es" | "en", "short")}</option>)}
                            </optgroup>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    MASS_UNITS.map((u) => <option key={u} value={u}>{unitLabel(u, locale as "es" | "en", "short")}</option>)
                  )}
                </select>
              </div>

              {mode === "absolute" && (
                <Controller
                  control={control}
                  name={`rows.${index}.scaleWithMeat`}
                  render={({ field: f }) => (
                    <button
                      type="button"
                      title={f.value ? "Escala con la carne (click para fijar)" : "Cantidad fija (click para escalar)"}
                      onClick={() => f.onChange(!f.value)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 14, padding: "0 8px", color: f.value ? "var(--ink-3)" : "var(--accent)" }}
                    >
                      {f.value ? "🔓" : "🔒"}
                    </button>
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => remove(index)}
                className="btn btn-ghost btn-sm"
                aria-label="Remove"
                style={{ color: "var(--warn)", borderColor: "transparent" }}
              >
                ×
              </button>
            </div>
          );
        })}
        <button type="button" onClick={addRow} className="btn w-full" style={{ justifyContent: "center" }}>
          + {t("addIngredient")}
        </button>
      </div>

      <div>
        <label className="label-lab" htmlFor="changeNote">
          {t("changeNote")}{isEditing ? " *" : ""}
        </label>
        <input
          id="changeNote"
          {...register("changeNote", { required: isEditing })}
          placeholder={isEditing ? t("changeNoteRequired") : t("changeNotePlaceholder")}
          className={`input-lab${errors.changeNote ? " err" : ""}`}
        />
      </div>

      <div>
        <label className="label-lab" htmlFor="instructions">{t("instructions")}</label>
        <textarea
          id="instructions"
          {...register("instructions")}
          placeholder={t("instructionsPlaceholder")}
          rows={4}
          className="textarea-lab"
        />
      </div>

      {saveError && <p style={{ fontSize: 13, color: "var(--warn)" }}>{saveError}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-lg"
          style={{ justifyContent: "center", flex: 1 }}
        >
          {isSubmitting ? t("saving") : isEditing ? t("saveVersion") : t("save")}
        </button>
        <button
          type="button"
          onClick={() => setShowAnalysis(true)}
          className="btn btn-lg btn-ghost"
          style={{ fontSize: 12, whiteSpace: "nowrap", color: "var(--accent)" }}
        >
          ✦ {locale === "en" ? "Ask Don Marco" : "Consultar a Don Marco"}
        </button>
      </div>

    </form>
    <DonMarcoDrawer
      open={showAnalysis}
      onClose={() => setShowAnalysis(false)}
      getPayload={getAnalyzePayload}
      locale={locale}
      hasAccepted={hasAcceptedDisclaimer ?? false}
    />
    <NewIngredientDialog
      open={dialogRowIndex !== null}
      onClose={() => setDialogRowIndex(null)}
      onCreated={handleIngredientCreated}
    />
    </>
  );
}
