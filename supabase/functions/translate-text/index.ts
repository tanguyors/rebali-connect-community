import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_MAP: Record<string, string> = {
  en: "en", id: "id", fr: "fr", es: "es", zh: "zh-CN", de: "de",
  nl: "nl", ru: "ru", tr: "tr", ar: "ar", hi: "hi", ja: "ja",
};

async function translateText(text: string, targetLang: string): Promise<string> {
  try {
    const tl = LANG_MAP[targetLang] || targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.[0]?.map((s: any) => s[0]).join("") || text;
  } catch {
    return text;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { texts, target_lang } = await req.json();

    if (!texts || !Array.isArray(texts) || !target_lang) {
      return new Response(JSON.stringify({ error: "Missing texts array or target_lang" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Translate all texts in parallel
    const translated = await Promise.all(
      texts.map((t: string) => translateText(t, target_lang))
    );

    return new Response(JSON.stringify({ translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("translate-text error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
