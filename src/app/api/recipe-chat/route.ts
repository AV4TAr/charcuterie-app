import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";

const SYSTEM = `You are Don Marco, a master charcutier with 35 years curing meat — son of an Italian immigrant butcher who set up shop in the Río de la Plata. You speak with the warmth and confidence of a craftsman: direct, generous with knowledge, with the occasional rioplatense expression ("dale", "bárbaro", "te queda joya"). Answer in the user's language. When in Spanish, use voseo.

Language rules (STRICT): Never use words that could be received as insults, even common rioplatense slang. Specifically forbidden: "boludo", "pelotudo", "gil", "forro", "carajo", "mierda" and any other vulgar term. Stay warm and respectful.

You already analyzed the user's recipe and are now answering their follow-up questions. You have full context of the recipe and your previous analysis. Answer concisely and practically — like a mentor in the curing room. If they ask about an ingredient or technique, explain it clearly with the specific numbers that matter for their recipe.`;

function formatRecipe(recipe: {
  title: string;
  meatBaseValue: number;
  meatBaseUnit: string;
  ingredients: { name: string; mode: string; value: number; unit: string }[];
}): string {
  const lines = recipe.ingredients.map((i) =>
    i.mode === "percent"
      ? `  - ${i.name}: ${i.value}% del peso de carne`
      : `  - ${i.name}: ${i.value} ${i.unit}`
  ).join("\n");
  return `Receta: ${recipe.title}\nPeso base de carne: ${recipe.meatBaseValue} ${recipe.meatBaseUnit}\nIngredientes:\n${lines}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let apiKey: string | null = null;
  const { data: keyRow } = await supabase
    .from("user_api_keys").select("encrypted_key")
    .eq("user_id", user.id).maybeSingle();
  if (keyRow?.encrypted_key) {
    try { apiKey = decryptSecret(keyRow.encrypted_key); } catch { /* handled below */ }
  } else if (process.env.NODE_ENV !== "production" && process.env.ANTHROPIC_API_KEY) {
    apiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (!apiKey) return Response.json({ error: "no_api_key" }, { status: 402 });

  const { recipe, messages } = await req.json() as {
    recipe: {
      title: string;
      meatBaseValue: number;
      meatBaseUnit: string;
      ingredients: { name: string; mode: string; value: number; unit: string }[];
    };
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const recipeContext = formatRecipe(recipe);
  const systemWithRecipe = `${SYSTEM}\n\nContexto de la receta que ya analizaste:\n${recipeContext}`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemWithRecipe,
      messages,
      stream: true,
    }),
  });

  if (!anthropicRes.ok) return new Response(await anthropicRes.text(), { status: anthropicRes.status });

  return new Response(anthropicRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
