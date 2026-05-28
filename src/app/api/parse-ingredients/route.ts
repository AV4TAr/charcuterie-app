import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";

const SYSTEM = `You are an ingredient list parser for a charcuterie/sausage recipe app.
The user provides a free-text list of ingredients (one per line, in Spanish or English).
Parse each line and return a JSON array. Each element:
  { "name": string, "amount": number, "unit": string }

Unit normalization rules (output ONLY these values):
  cda / cdas / cucharada / cucharadas / tbsp / T  →  "tbsp"
  cdita / cditas / cucharadita / cucharaditas / tsp / t  →  "tsp"
  taza / tazas / cup / cups  →  "cup"
  g / gr / gramo / gramos / gram / grams  →  "g"
  kg / kilo / kilos / kilogram  →  "kg"
  oz / onza / onzas / ounce  →  "oz"
  lb / libra / libras / pound  →  "lb"
  ml / mililitro / mililitros / milliliter  →  "ml"
  l / litro / litros / liter  →  "l"
  floz / fl oz / fluid ounce  →  "floz"
  cm / centimetro / centimetros  →  "cm"
  m / metro / metros / meter  →  "m"
  u / ud / unidad / unidades / pieza / piezas / piece / pieces  →  "piece"
  If no unit is clear, default to "g".

Capitalize ingredient names properly (e.g. "sal fina" → "Sal fina").
Return ONLY the JSON array, no markdown, no explanation.`;

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

  const { text } = await req.json() as { text: string };
  if (!text?.trim()) return Response.json([], { status: 200 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!res.ok) return new Response(await res.text(), { status: res.status });

  const data = await res.json() as { content: { type: string; text: string }[] };
  const raw = data.content.find((b) => b.type === "text")?.text ?? "[]";
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "parse_failed" }, { status: 500 });
  }
}
