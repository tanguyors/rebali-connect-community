import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TARGET_LANGS = ["en", "id", "fr", "es", "zh", "de", "nl", "ru"];

async function translateText(text: string, targetLang: string, sourceLang: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    // Google returns [[["translated text","original text",...],...],...]
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

    const sourceLang = listing.lang_original || "en";
    const langsToTranslate = TARGET_LANGS.filter((l) => l !== sourceLang);

    // Translate in parallel
    const results = await Promise.all(
      langsToTranslate.map(async (lang) => {
        const [title, description] = await Promise.all([
          translateText(listing.title_original, lang, sourceLang),
          translateText(listing.description_original, lang, sourceLang),
        ]);
        return { lang, title, description };
      })
    );

    // Also set the source language translation to original text
    results.push({
      lang: sourceLang,
      title: listing.title_original,
      description: listing.description_original,
    });

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
