"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { RecipeForm, type DbIngredient } from "./recipe-form";

const T = {
  es: {
    heading: "Nueva receta",
    question: "¿Cómo querés empezar?",
    aiTitle: "Con Don Marco",
    aiDesc: "Describí el chorizo que querés y Don Marco arma la fórmula por vos. Podés ajustarla después.",
    manualTitle: "Armar manual",
    manualDesc: "Empezá con el formulario y agregá tus ingredientes a tu ritmo.",
  },
  en: {
    heading: "New recipe",
    question: "How do you want to start?",
    aiTitle: "With Don Marco",
    aiDesc: "Describe the sausage you want and Don Marco drafts the formula. You can tweak it afterwards.",
    manualTitle: "Build manually",
    manualDesc: "Start with the form and add your ingredients at your own pace.",
  },
};

export function NewRecipeChooser({
  locale,
  ingredients,
  userId,
  hasAcceptedDisclaimer,
}: {
  locale: string;
  ingredients: DbIngredient[];
  userId: string;
  hasAcceptedDisclaimer: boolean;
}) {
  const [mode, setMode] = useState<"choose" | "form">("choose");
  const router = useRouter();
  const lang = locale === "en" ? "en" : "es";
  const t = T[lang];

  if (mode === "form") {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="serif" style={{ fontSize: 32, margin: "0 0 32px", color: "var(--ink)" }}>
          {t.heading}
        </h1>
        <RecipeForm
          locale={locale}
          ingredients={ingredients}
          userId={userId}
          hasAcceptedDisclaimer={hasAcceptedDisclaimer}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" style={{ paddingTop: 40 }}>
      <h1 className="serif" style={{ fontSize: 32, margin: "0 0 6px", color: "var(--ink)" }}>
        {t.heading}
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 40px", fontFamily: "var(--mono)" }}>
        {t.question}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Don Marco option */}
        <button
          onClick={() => router.push("/don-marco")}
          style={{
            background: "var(--paper)",
            border: "2px solid var(--accent)",
            borderRadius: 12,
            padding: "28px 24px",
            textAlign: "left",
            cursor: "pointer",
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                width: 32, height: 32, borderRadius: 999,
                background: "var(--accent)", color: "var(--paper)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic",
                flexShrink: 0,
              }}
            >
              M
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
              {t.aiTitle}
            </span>
            <span className="tag tag-accent" style={{ fontSize: 8, padding: "1px 5px", marginLeft: 2 }}>
              ✦ IA
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.5 }}>
            {t.aiDesc}
          </p>
        </button>

        {/* Manual option */}
        <button
          onClick={() => setMode("form")}
          style={{
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: 12,
            padding: "28px 24px",
            textAlign: "left",
            cursor: "pointer",
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 999,
              background: "var(--bg-2)", border: "1px solid var(--rule)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>
              ≡
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
              {t.manualTitle}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.5 }}>
            {t.manualDesc}
          </p>
        </button>
      </div>
    </div>
  );
}
