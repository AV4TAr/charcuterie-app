import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { WeightCalculator } from "@/components/recipe/weight-calculator";
import { demoRecipe } from "@/lib/recipes/demo-recipe";
import type { Locale } from "@/lib/i18n/config";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");

  const isEs = locale === "es";

  const pillars = [
    {
      num: "01",
      head: isEs ? "Pensá en %, no en g" : "Think in %, not g",
      body: isEs
        ? "La sal son 2 % del peso de carne. Lo va a seguir siendo cuando hagas 50 kg."
        : "Salt is 2 % of the meat weight. It still will be when you batch 50 kg.",
    },
    {
      num: "02",
      head: isEs ? "Cada cambio es un commit" : "Every change is a commit",
      body: isEs
        ? "Subiste el ajo el verano pasado. Está ahí: v3, con tu nota y la fecha."
        : "You bumped the garlic last summer. It's there: v3, with your note and the date.",
    },
    {
      num: "03",
      head: isEs ? "Forks y proposals" : "Forks and proposals",
      body: isEs
        ? "Partí de la receta de tu primo. Devolvele tu mejora como propuesta."
        : "Fork your cousin's recipe. Send your tweak back as a proposal.",
    },
  ];

  const stats = [
    { k: "13", l: isEs ? "unidades soportadas" : "units supported" },
    { k: "∞", l: isEs ? "versiones por receta" : "versions per recipe" },
    { k: "%", l: isEs ? "por defecto, no g" : "by default, not g" },
  ];

  return (
    <div className="space-y-20">
      <section className="lab-grid-bg -mx-4 px-4 py-12 md:py-20" style={{ borderRadius: 14, border: "1px solid var(--rule)" }}>
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-start">
          <div>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className="stamp">LAB · SPEC 04.26</span>
              <span className="eyebrow">v0.4 · public alpha</span>
            </div>
            <h1 className="serif" style={{ fontSize: "clamp(48px, 8vw, 84px)", lineHeight: 0.95, margin: 0, letterSpacing: "-0.02em" }}>
              {isEs ? (
                <>El chorizo<br />como una <em style={{ color: "var(--accent)" }}>fórmula</em>,<br />no como un<br />borrador.</>
              ) : (
                <>Chorizo as<br />a <em style={{ color: "var(--accent)" }}>formula</em>,<br />not a rough<br />draft.</>
              )}
            </h1>
            <p style={{ maxWidth: 460, marginTop: 24, fontSize: 16, lineHeight: 1.5, color: "var(--ink-2)" }}>
              {isEs
                ? "Cargá tu receta una vez en las unidades que tengas a mano. Escalá a cualquier peso. Versioná cada cambio. Bifurcá la de otros. Conservá la nota de por qué le subiste el pimentón ahumado en marzo."
                : "Enter the recipe once in whatever units you have at hand. Scale to any weight. Version every change. Fork someone else's. Keep the note about why you bumped the smoked paprika last March."}
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link href="/explore" className="btn btn-primary btn-lg">
                → {t("ctaTry")}
              </Link>
              <Link href="/new" className="btn btn-lg">
                + {tNav("newRecipe")}
              </Link>
            </div>

            <div className="flex flex-wrap gap-7 mt-12">
              {stats.map((s, i) => (
                <div key={i} style={{ borderLeft: "1px solid var(--rule)", paddingLeft: 14 }}>
                  <div className="serif" style={{ fontSize: 36, lineHeight: 1, color: "var(--accent-2)" }}>{s.k}</div>
                  <div className="eyebrow" style={{ marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute", top: -14, left: 16, zIndex: 2,
                padding: "4px 10px",
                background: "var(--accent)", color: "white",
                fontFamily: "var(--mono)", fontSize: 10,
                letterSpacing: "0.18em", textTransform: "uppercase",
                transform: "rotate(-1deg)",
              }}
            >
              {isEs ? "Probalo en vivo" : "Try it live"}
            </div>

            <div
              style={{
                border: "1px solid var(--ink)",
                borderRadius: 10,
                background: "var(--paper)",
                overflow: "hidden",
                boxShadow: "0 30px 60px -30px rgba(0,0,0,0.25), 8px 8px 0 var(--rule-soft)",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  borderBottom: "1px solid var(--rule)",
                  flexWrap: "wrap",
                }}
              >
                <span className="serif" style={{ fontSize: 22 }}>Chorizo Criollo</span>
                <span className="tag mono">v1 · demo</span>
                <span style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>@demo</span>
              </div>
              <div style={{ padding: 12 }}>
                <WeightCalculator
                  ingredients={demoRecipe.ingredients}
                  initialMeatAmount={1}
                  initialMeatUnit="kg"
                  locale={locale}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((p) => (
            <div key={p.num} style={{ paddingTop: 16, borderTop: "1px solid var(--ink)" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--accent)" }}>{p.num}</div>
              <h3 className="serif" style={{ fontSize: 28, margin: "8px 0 10px", letterSpacing: "-0.01em" }}>{p.head}</h3>
              <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          paddingTop: 24,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span>Chorizo Lab · 2026</span>
        <span>·</span>
        <span>PWA installable</span>
        <span>·</span>
        <span>offline-first</span>
        <span style={{ flex: 1 }} />
        <span>es · en</span>
      </footer>
    </div>
  );
}
