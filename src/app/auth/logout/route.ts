import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const referer = request.headers.get("referer");
  const target = referer ?? new URL("/", request.url).toString();
  return NextResponse.redirect(target, { status: 303 });
}
