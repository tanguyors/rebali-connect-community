import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TARGET_LANGS = ["en", "id", "fr", "es", "zh", "de", "nl", "ru", "tr", "ar", "hi", "ja"];

// Map our lang codes to Google Translate language codes
const LANG_MAP: Record<string, string> = {
  en: "en", id: "id", fr: "fr", es: "es", zh: "zh-CN", de: "de",
  nl: "nl", ru: "ru", tr: "tr", ar: "ar", hi: "hi", ja: "ja",
};

async function translateText(text: string, targetLang: string): Promise<string> {
  try {
    const tl = LANG_MAP[targetLang] || targetLang;
    // Always use auto-detect for source language to handle mismatched lang_original
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
    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get listing
    const { data: listing, error } = await supabase
      .from("listings")
      .select("title_original, description_original, lang_original")
      .eq("id", listing_id)
      .single();

    if (error || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Translate ALL languages using auto-detect — even the "source" language,
    // because lang_original may be wrong (user might write in a different language)
    const results = await Promise.all(
      TARGET_LANGS.map(async (lang) => {
        const [title, description] = await Promise.all([
          translateText(listing.title_original, lang),
          translateText(listing.description_original, lang),
        ]);
        return { lang, title, description };
      })
    );

    // Upsert translations
    for (const r of results) {
      // Try update first
      const { data: existing } = await supabase
        .from("listing_translations")
        .select("id")
        .eq("listing_id", listing_id)
        .eq("lang", r.lang)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("listing_translations")
          .update({ title: r.title, description: r.description, is_machine: true })
          .eq("id", existing.id);
      } else {
        await supabase.from("listing_translations").insert({
          listing_id,
          lang: r.lang,
          title: r.title,
          description: r.description,
          is_machine: true,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, translated: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
