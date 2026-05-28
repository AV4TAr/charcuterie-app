"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { WeightCalculator } from "@/components/recipe/weight-calculator";
import { saveAIRecipe, type AIRecipe, type AIIngredient } from "@/app/actions/save-ai-recipe";
import type { RecipeIngredient } from "@/lib/recipes/calculator";
import type { Unit } from "@/lib/units";

type Locale = "es" | "en";

type ChatEntry = {
  user: string;
  assistantText: string;
  assistantRaw: string;
  needsApiKey?: boolean;
};

const EXAMPLES: Record<Locale, string[]> = {
  es: [
    "Chorizo clásico parrillero uruguayo.",
    "Un chorizo argentino para parrilla, fresco, intenso pero no picante.",
    "Salame seco italiano, 28 días de oreo, vino tinto.",
    "Boudin blanco francés, suave, con huevo y leche.",
    "Sobrasada mallorquina, untable, mucho pimentón, sin cocción.",
  ],
  en: [
    "A fresh Argentine grilling chorizo, intense but not spicy.",
    "Italian dry salami, 28-day cure, red wine.",
    "French boudin blanc, mild, with egg and milk.",
    "Mallorquin sobrasada, spreadable, lots of paprika, uncooked.",
  ],
};

const T: Record<Locale, Record<string, string>> = {
  es: {
    headline1: "Contame qué",
    headline2: "chorizo",
    headline3: "querés hacer.",
    subtitle:
      "Describilo como se lo describirías a un colega: estilo, intensidad, origen, técnica de cocción. Don Marco arma la fórmula y la podés ajustar después.",
    examples: "Ejemplos",
    inputPlaceholder: "Describí tu chorizo…",
    inputPlaceholderFollowup: "Pedile ajustes... (ej. menos sal, mas ajo, sin vino)",
    send: "Enviar ↑",
    busy: "…",
    donMarcoRole: "maestro charcutero",
    enterHint: "↵ enviar · shift+↵ línea nueva",
    emptyPanelLabel: "Tu receta aparece acá",
    emptyPanelHint:
      "Cuando Don Marco termine de proponerte la fórmula, vas a poder tocar cualquier cantidad o unidad acá.",
    draftLabel: "Borrador · escala en vivo",
    procedure: "Procedimiento",
    moreSteps: "pasos más",
    draft: "borrador",
    saveV1: "Guardar como v1",
    saving: "Guardando…",
    formMode: "Modo formulario",
    revert: "↺ Revertir",
    aiBadge: "IA · beta",
    breadcrumb: "Nueva receta · asistente",
    doneLive: "Listo. Mirá la receta en el panel de la derecha.",
    noApiKey: "Para usar Don Marco necesitás tu propia clave de Anthropic. Andá a Ajustes y cargala.",
    goToSettings: "Ir a Ajustes →",
  },
  en: {
    headline1: "Tell me what",
    headline2: "sausage",
    headline3: "you want to make.",
    subtitle:
      "Describe it the way you would to a colleague: style, intensity, origin, cooking technique. Don Marco drafts the formula — tweak it later.",
    examples: "Examples",
    inputPlaceholder: "Describe your sausage…",
    inputPlaceholderFollowup: "Ask for changes…",
    send: "Send ↑",
    busy: "…",
    donMarcoRole: "master charcutier",
    enterHint: "↵ send · shift+↵ new line",
    emptyPanelLabel: "Your recipe will appear here",
    emptyPanelHint:
      "Once Don Marco proposes a formula, you can tweak any amount or unit right here.",
    draftLabel: "Draft · live scale",
    procedure: "Procedure",
    moreSteps: "more steps",
    draft: "draft",
    saveV1: "Save as v1",
    saving: "Saving…",
    formMode: "Form mode",
    revert: "↺ Revert",
    aiBadge: "AI · beta",
    breadcrumb: "New recipe · assistant",
    doneLive: "Done. Check the recipe on the right.",
    noApiKey: "To use Don Marco, add your own Anthropic API key in Settings.",
    goToSettings: "Open Settings →",
  },
};

function tryParseJSON(s: string): AIRecipe | null {
  if (!s) return null;
  const cleaned = s.replace(/^```(?:json)?\n?/, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as AIRecipe;
  } catch {}
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(cleaned.slice(a, b + 1)) as AIRecipe;
    } catch {}
  }
  return null;
}

function inferMeasurementType(unit: string): RecipeIngredient["measurementType"] {
  if (["g", "kg", "oz", "lb"].includes(unit)) return "mass";
  if (["ml", "l", "floz", "tsp", "tbsp", "cup"].includes(unit)) return "volume";
  if (["cm", "m"].includes(unit)) return "length";
  return "count";
}

function toCalculatorIngredients(aiIngredients: AIIngredient[]): RecipeIngredient[] {
  return aiIngredients.map((ing, i) => {
    const measurementType = inferMeasurementType(ing.canonical_unit);
    return {
      id: `ai-${i}`,
      name: ing.name,
      measurementType,
      defaultDensityGPerMl: ing.density,
      mode: ing.mode,
      percentOfMeat: ing.mode === "percent" ? (ing.percent_of_meat ?? 0) : null,
      amountCanonical: ing.mode === "absolute" ? (ing.amount_canonical ?? 0) : null,
      displayUnit: (ing.display_unit || ing.canonical_unit || "g") as Unit,
      sortOrder: i,
    };
  });
}

function ChatBubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isUser ? "1fr 28px" : "28px 1fr",
        gap: 10,
        marginBottom: 14,
      }}
    >
      {!isUser && (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "var(--accent)",
            color: "var(--paper)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--serif)",
            fontSize: 16,
            fontStyle: "italic",
            flexShrink: 0,
          }}
        >
          M
        </span>
      )}
      <div
        style={{
          gridColumn: isUser ? 1 : 2,
          background: isUser ? "var(--bg-2)" : "var(--paper)",
          border: `1px solid ${isUser ? "var(--rule-soft)" : "var(--rule)"}`,
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--ink)",
          textAlign: "left",
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </div>
      {isUser && (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "var(--rule)",
            color: "var(--ink-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--mono)",
            fontSize: 10,
            flexShrink: 0,
          }}
        >
          yo
        </span>
      )}
    </div>
  );
}

export function DonMarcoClient({ locale }: { locale: string }) {
  const lang = (locale === "en" ? "en" : "es") as Locale;
  const t = T[lang];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [recipe, setRecipe] = useState<AIRecipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const calculatorIngredients = recipe ? toCalculatorIngredients(recipe.ingredients) : [];
  const meatBaseKg = recipe ? recipe.meat_base_grams / 1000 : 1;

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setSaveError(null);

    const userMsg = text.trim();
    const newEntry: ChatEntry = { user: userMsg, assistantText: "…", assistantRaw: "" };
    setHistory((h) => [...h, newEntry]);
    setInput("");
    setStreamingText("");

    const messages = [
      ...history.flatMap((h) => [
        { role: "user" as const, content: h.user },
        { role: "assistant" as const, content: h.assistantRaw },
      ]),
      { role: "user" as const, content: userMsg },
    ];

    try {
      const res = await fetch("/api/don-marco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errCode = "";
        let errMsg = errText;
        try {
          const parsed = JSON.parse(errText);
          errCode = parsed.error ?? "";
          errMsg = parsed.error ?? errText;
        } catch {}
        if (res.status === 402 && errCode === "no_api_key") {
          setHistory((h) =>
            h.map((x, i) =>
              i === h.length - 1
                ? { ...x, assistantText: t.noApiKey, needsApiKey: true }
                : x,
            ),
          );
        } else {
          setHistory((h) =>
            h.map((x, i) =>
              i === h.length - 1 ? { ...x, assistantText: "Error: " + errMsg } : x,
            ),
          );
        }
        setBusy(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

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
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta"
            ) {
              accumulated += event.delta.text;
              setStreamingText(accumulated);
            }
          } catch {}
        }
      }

      const parsed = tryParseJSON(accumulated);
      if (parsed && parsed.ingredients) {
        const norm: AIRecipe = {
          ...parsed,
          meat_base_grams: parsed.meat_base_grams || 1000,
          ingredients: parsed.ingredients.map((ing) => ({
            ...ing,
            mode: ing.mode || "percent",
            canonical_unit: ing.canonical_unit || "g",
            display_unit: ing.display_unit || ing.canonical_unit || "g",
          })),
        };
        setRecipe(norm);
        const explanation = parsed.explanation ?? t.doneLive;
        setHistory((h) =>
          h.map((x, i) =>
            i === h.length - 1
              ? { ...x, assistantText: explanation, assistantRaw: accumulated }
              : x,
          ),
        );
      } else {
        setHistory((h) =>
          h.map((x, i) =>
            i === h.length - 1
              ? { ...x, assistantText: accumulated || "No se pudo generar la receta.", assistantRaw: accumulated }
              : x,
          ),
        );
      }
    } catch (e) {
      setHistory((h) =>
        h.map((x, i) =>
          i === h.length - 1 ? { ...x, assistantText: "Error: " + String(e) } : x,
        ),
      );
    } finally {
      setBusy(false);
      setStreamingText("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function handleSave() {
    if (!recipe) return;
    setSaveError(null);
    startTransition(async () => {
      try {
        const { recipeId } = await saveAIRecipe(recipe);
        router.push(`/r/${recipeId}`);
      } catch (e) {
        setSaveError(String(e));
      }
    });
  }

  return (
    <div>
      {/* Top bar */}
      <div
        style={{
          padding: "10px 0",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
          / {t.breadcrumb}
        </span>
        <span className="tag tag-accent" style={{ fontSize: 9 }}>
          ✦ {t.aiBadge}
        </span>
        <span style={{ flex: 1 }} />
        <a href={`/${lang}/new`} className="btn btn-sm btn-ghost">
          {t.formMode}
        </a>
        <button
          className="btn btn-primary btn-sm"
          disabled={!recipe || isPending}
          onClick={handleSave}
        >
          {isPending ? t.saving : t.saveV1}
        </button>
      </div>

      {saveError && (
        <div
          style={{
            padding: "8px 0",
            fontSize: 12,
            color: "var(--warn)",
            fontFamily: "var(--mono)",
            marginBottom: 8,
          }}
        >
          {saveError}
        </div>
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: chat */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 720 }}>
          {/* Headline */}
          <div>
            <h1
              className="serif"
              style={{
                fontSize: 40,
                lineHeight: 0.96,
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              {t.headline1}{" "}
              <em style={{ color: "var(--accent)", fontStyle: "italic" }}>{t.headline2}</em>
              <br />
              {t.headline3}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.5,
                margin: "0 0 20px",
                maxWidth: 460,
              }}
            >
              {t.subtitle}
            </p>
          </div>

          {/* Examples shown when no history */}
          {history.length === 0 && (
            <div style={{ flexShrink: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                {t.examples}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {EXAMPLES[lang].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                    disabled={busy}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      background: "var(--paper)",
                      border: "1px solid var(--rule)",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--ink-2)",
                      fontFamily: "inherit",
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: "var(--accent)", marginRight: 6 }}>→</span>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {history.length > 0 && (
            <div
              style={{
                flex: 1,
                paddingRight: 4,
                marginBottom: 12,
              }}
            >
              {history.map((h, i) => (
                <div key={i}>
                  <ChatBubble role="user">{h.user}</ChatBubble>
                  <ChatBubble role="assistant">
                    {h.assistantText === "…" ? (
                      <span className="mono" style={{ color: "var(--ink-3)" }}>
                        ● ● ●
                      </span>
                    ) : h.needsApiKey ? (
                      <>
                        <span>{h.assistantText}</span>
                        <div style={{ marginTop: 10 }}>
                          <a
                            href={`/${lang}/settings`}
                            className="btn btn-sm btn-primary"
                            style={{ display: "inline-flex" }}
                          >
                            {t.goToSettings}
                          </a>
                        </div>
                      </>
                    ) : (
                      h.assistantText
                    )}
                  </ChatBubble>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input area — sticky at bottom of viewport */}
          <div
            style={{
              marginTop: "auto",
              position: "sticky",
              bottom: 24,
              paddingBottom: 8,
              background: "var(--bg)",
            }}
          >
            <div
              className="card"
              style={{ padding: 10, display: "flex", gap: 8, alignItems: "flex-end" }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={recipe ? t.inputPlaceholderFollowup : t.inputPlaceholder}
                rows={2}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  resize: "none",
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: "var(--ink)",
                  fontFamily: "inherit",
                  padding: 6,
                  minHeight: 40,
                }}
              />
              <button
                disabled={busy || !input.trim()}
                onClick={() => send(input)}
                className="btn btn-primary"
                style={{ opacity: busy || !input.trim() ? 0.4 : 1 }}
              >
                {busy ? t.busy : t.send}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--ink-3)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "var(--good)",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "var(--ink-2)" }}>Don Marco</span>
              <span>· {t.donMarcoRole}</span>
              <span style={{ flex: 1 }} />
              <span>{t.enterHint}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div
          style={{
            position: "sticky",
            top: 80,
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
            paddingBottom: 24,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {recipe ? t.draftLabel : t.emptyPanelLabel}
          </div>

          {!recipe && (
            <div
              className="lab-grid-bg"
              style={{
                minHeight: 480,
                borderRadius: 8,
                border: "1px dashed var(--rule)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 32,
                textAlign: "center",
              }}
            >
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect
                  x="14"
                  y="20"
                  width="36"
                  height="32"
                  rx="2"
                  stroke="var(--ink-3)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <line x1="20" y1="28" x2="44" y2="28" stroke="var(--ink-3)" strokeWidth="1" />
                <line x1="20" y1="34" x2="44" y2="34" stroke="var(--ink-3)" strokeWidth="1" />
                <line x1="20" y1="40" x2="36" y2="40" stroke="var(--ink-3)" strokeWidth="1" />
                <circle
                  cx="50"
                  cy="18"
                  r="6"
                  fill="var(--accent)"
                  fillOpacity="0.2"
                  stroke="var(--accent)"
                />
                <text
                  x="50"
                  y="22"
                  textAnchor="middle"
                  fontFamily="serif"
                  fontSize="10"
                  fill="var(--accent)"
                  fontStyle="italic"
                >
                  M
                </text>
              </svg>
              <p
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)", maxWidth: 240, lineHeight: 1.5 }}
              >
                {t.emptyPanelHint}
              </p>
            </div>
          )}

          {recipe && (
            <div>
              {/* Recipe header card */}
              <div className="card" style={{ padding: 16, marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <h2
                    className="serif"
                    style={{
                      fontSize: 26,
                      margin: 0,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.1,
                      color: "var(--ink)",
                    }}
                  >
                    {recipe.title}
                  </h2>
                  <span className="tag mono" style={{ marginLeft: "auto", fontSize: 9 }}>
                    {t.draft}
                  </span>
                </div>
                {recipe.description && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      lineHeight: 1.5,
                      margin: "6px 0",
                    }}
                  >
                    {recipe.description}
                  </p>
                )}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {recipe.tags.map((tag, i) => (
                      <span key={i} className="tag" style={{ fontSize: 9 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Live calculator */}
              <WeightCalculator
                ingredients={calculatorIngredients}
                initialMeatAmount={meatBaseKg}
                initialMeatUnit="kg"
                locale={lang}
              />

              {/* Steps */}
              {recipe.steps && recipe.steps.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    {t.procedure}
                  </div>
                  <ol style={{ padding: 0, listStyle: "none", margin: 0 }}>
                    {recipe.steps.slice(0, 5).map((s, i) => (
                      <li
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "28px 1fr",
                          gap: 10,
                          padding: "7px 0",
                          borderBottom: "1px dashed var(--rule-soft)",
                        }}
                      >
                        <span
                          className="mono"
                          style={{ fontSize: 10, color: "var(--accent)", paddingTop: 2 }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>
                          {s}
                        </span>
                      </li>
                    ))}
                    {recipe.steps.length > 5 && (
                      <li
                        style={{
                          padding: "7px 0",
                          fontSize: 11,
                          color: "var(--ink-3)",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        + {recipe.steps.length - 5} {t.moreSteps}
                      </li>
                    )}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
