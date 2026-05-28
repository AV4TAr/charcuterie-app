import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";

const SYSTEM = `You are a culinary translator specializing in charcuterie and sausage-making ingredients.
Given an ingredient name (in any language), return a JSON object with its name in Spanish and English.
Use the common culinary term used in professional kitchens.
Return ONLY valid JSON, no markdown, no explanation.
Format: {"name_es": "...", "name_en": "..."}`;

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

  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return Response.json({ name_es: name, name_en: name });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 128,
      system: SYSTEM,
      messages: [{ role: "user", content: name }],
    }),
  });

  if (!res.ok) return Response.json({ name_es: name, name_en: name });

  const data = await res.json() as { content: { type: string; text: string }[] };
  const raw = data.content.find((b) => b.type === "text")?.text ?? "{}";
  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned) as { name_es?: string; name_en?: string };
    return Response.json({
      name_es: parsed.name_es ?? name,
      name_en: parsed.name_en ?? name,
    });
  } catch {
    return Response.json({ name_es: name, name_en: name });
  }
}
