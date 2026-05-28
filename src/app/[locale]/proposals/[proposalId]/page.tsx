import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";
import { VersionDiff, type IngredientSnap } from "@/components/recipe/version-diff";
import { ProposalActions } from "./proposal-actions";

const STATUS_COLOR: Record<string, string> = {
  open: "var(--good)",
  accepted: "var(--accent)",
  rejected: "var(--warn)",
  closed: "var(--ink-3)",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; proposalId: string }>;
}) {
  const { locale, proposalId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: proposal } = await supabase
    .from("proposals")
    .select(`
      id, title, description, status, created_at, decided_at,
      source_recipe_id, source_version_id, target_recipe_id,
      profiles!created_by(username, display_name)
    `)
    .eq("id", proposalId)
    .maybeSingle();

  if (!proposal) notFound();

  const [sourceRecipeRes, targetRecipeRes] = await Promise.all([
    supabase.from("recipes").select("id, title, profiles!owner_id(username)").eq("id", proposal.source_recipe_id).maybeSingle(),
    supabase.from("recipes").select("id, title, owner_id, current_version_id, profiles!owner_id(username)").eq("id", proposal.target_recipe_id).maybeSingle(),
  ]);

  const sourceRecipe = sourceRecipeRes.data;
  const targetRecipe = targetRecipeRes.data;

  const [sourceIngsRes, targetIngsRes, commentsRes, targetVersionRes] = await Promise.all([
    supabase
      .from("recipe_version_ingredients")
      .select("ingredient_id, mode, percent_of_meat, amount_canonical, display_unit, sort_order, ingredients(name)")
      .eq("version_id", proposal.source_version_id)
      .order("sort_order"),
    targetRecipe?.current_version_id
      ? supabase
          .from("recipe_version_ingredients")
          .select("ingredient_id, mode, percent_of_meat, amount_canonical, display_unit, sort_order, ingredients(name)")
          .eq("version_id", targetRecipe.current_version_id)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase
      .from("proposal_comments")
      .select("id, body, created_at, profiles!author_id(username, display_name)")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true }),
    targetRecipe?.current_version_id
      ? supabase.from("recipe_versions").select("version_number").eq("id", targetRecipe.current_version_id).single()
      : Promise.resolve({ data: null }),
  ]);

  function toSnap(rows: typeof sourceIngsRes.data): IngredientSnap[] {
    return (rows ?? []).map((r) => {
      const ing = r.ingredients as unknown as { name: string } | null;
      return {
        ingredientId: r.ingredient_id,
        name: ing?.name ?? "?",
        mode: r.mode as "percent" | "absolute",
        percentOfMeat: r.percent_of_meat != null ? Number(r.percent_of_meat) : null,
        amountCanonical: r.amount_canonical != null ? Number(r.amount_canonical) : null,
        displayUnit: r.display_unit,
      };
    });
  }

  const sourceSnaps = toSnap(sourceIngsRes.data ?? []);
  const targetSnaps = toSnap((targetIngsRes as { data: typeof sourceIngsRes.data }).data ?? []);

  const proposer = proposal.profiles as unknown as { username: string; display_name: string | null } | null;
  const targetOwner = targetRecipe?.profiles as unknown as { username: string } | null;
  const sourceOwner = sourceRecipe?.profiles as unknown as { username: string } | null;
  const isTargetOwner = user?.id === targetRecipe?.owner_id;
  const isOpen = proposal.status === "open";
  const targetVersionNumber = targetVersionRes.data?.version_number ?? 1;

  const t = await getTranslations("proposals");
  const tRecipe = await getTranslations("recipe");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: STATUS_COLOR[proposal.status] ?? "var(--ink-3)",
              color: "var(--paper)",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            ● {t(proposal.status as "open" | "accepted" | "rejected" | "closed")}
          </span>
        </div>
        <h1 className="serif" style={{ fontSize: 36, lineHeight: 1, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
          {proposal.title}
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingBottom: 18,
            borderBottom: "1px solid var(--rule)",
            fontSize: 13,
            color: "var(--ink-2)",
          }}
        >
          <span>
            <strong>@{proposer?.username}</strong>{" "}
            {t("wantsToMerge")}{" "}
            {targetRecipe && (
              <Link href={`/r/${targetRecipe.id}`} style={{ color: "var(--accent-2)", textDecoration: "underline" }}>
                {targetRecipe.title}
              </Link>
            )}
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" }}>
            {new Date(proposal.created_at).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Description */}
          {proposal.description && (
            <div className="card" style={{ padding: 0 }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--rule)",
                  background: "var(--bg-2)",
                  fontSize: 13,
                }}
              >
                <strong>@{proposer?.username}</strong>
              </div>
              <div style={{ padding: 16, fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                {proposal.description}
              </div>
            </div>
          )}

          {/* Diff */}
          <div>
            <div
              className="eyebrow"
              style={{ marginBottom: 14, borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}
            >
              Δ {t("proposedChanges")}
            </div>
            <VersionDiff
              fromLabel={`@${targetOwner?.username}:v${targetVersionNumber}`}
              toLabel={`@${sourceOwner?.username}:fork`}
              fromIngredients={targetSnaps}
              toIngredients={sourceSnaps}
            />
          </div>

          {/* Conversation */}
          <div>
            <div
              className="eyebrow"
              style={{ marginBottom: 14, borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}
            >
              § {t("conversation")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(commentsRes.data ?? []).map((c) => {
                const author = c.profiles as unknown as { username: string; display_name: string | null } | null;
                return (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--bg-2)",
                        border: "1px solid var(--rule)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--ink-2)",
                        flexShrink: 0,
                      }}
                    >
                      {(author?.display_name ?? author?.username ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="card" style={{ padding: 0 }}>
                      <div
                        style={{
                          padding: "8px 14px",
                          borderBottom: "1px solid var(--rule-soft)",
                          background: "var(--bg-2)",
                          fontSize: 12,
                        }}
                      >
                        <strong>@{author?.username}</strong>
                        <span className="mono" style={{ color: "var(--ink-3)", marginLeft: 8 }}>
                          {new Date(c.created_at).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div style={{ padding: 12, fontSize: 13, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                        {c.body}
                      </div>
                    </div>
                  </div>
                );
              })}

              {user && isOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--accent-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    yo
                  </div>
                  <ProposalActions
                    proposalId={proposalId}
                    targetVersionNumber={targetVersionNumber}
                    isTargetOwner={isTargetOwner}
                  />
                </div>
              )}

              {!user && (
                <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
                  <Link href="/login" style={{ color: "var(--accent-2)" }}>
                    {tRecipe("signInToComment")}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Proposal</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.8 }}>
              <div>
                <span style={{ color: "var(--ink-3)" }}>{t("from")}</span>{" "}
                @{sourceOwner?.username}
              </div>
              <div>
                <span style={{ color: "var(--ink-3)" }}>{t("into")}</span>{" "}
                @{targetOwner?.username}
              </div>
            </div>
          </div>

          {isOpen && isTargetOwner && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{t("ifAccepted")}</div>
              <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>
                {t("ifAcceptedDesc")}
              </p>
            </div>
          )}

          {targetRecipe && (
            <div>
              <Link href={`/r/${targetRecipe.id}`} className="btn btn-sm btn-ghost" style={{ width: "100%" }}>
                ← {targetRecipe.title}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
