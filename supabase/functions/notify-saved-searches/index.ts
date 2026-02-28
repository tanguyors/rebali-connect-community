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

async function translateText(text: string, targetLang: string, sourceLang = "auto"): Promise<string> {
  if (sourceLang === targetLang) return text;
  try {
    const tl = LANG_MAP[targetLang] || targetLang;
    const sl = sourceLang === "auto" ? "auto" : (LANG_MAP[sourceLang] || sourceLang);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.[0]?.map((s: any) => s[0]).join("") || text;
  } catch {
    return text;
  }
}

// Pre-translated notification templates
const ALERT_TEMPLATES: Record<string, { alert: string; newListing: string; seeIt: string }> = {
  en: { alert: "Re-Bali Alert", newListing: "New listing matching your search", seeIt: "See listing" },
  fr: { alert: "Alerte Re-Bali", newListing: "Nouvelle annonce correspondant à votre recherche", seeIt: "Voir l'annonce" },
  id: { alert: "Pemberitahuan Re-Bali", newListing: "Iklan baru sesuai pencarian Anda", seeIt: "Lihat iklan" },
  es: { alert: "Alerta Re-Bali", newListing: "Nuevo anuncio que coincide con tu búsqueda", seeIt: "Ver anuncio" },
  de: { alert: "Re-Bali Alarm", newListing: "Neue Anzeige passend zu Ihrer Suche", seeIt: "Anzeige ansehen" },
  nl: { alert: "Re-Bali Melding", newListing: "Nieuwe advertentie bij uw zoekopdracht", seeIt: "Bekijk advertentie" },
  ru: { alert: "Уведомление Re-Bali", newListing: "Новое объявление по вашему запросу", seeIt: "Посмотреть" },
  zh: { alert: "Re-Bali 提醒", newListing: "符合您搜索的新列表", seeIt: "查看列表" },
  tr: { alert: "Re-Bali Uyarısı", newListing: "Aramanıza uyan yeni ilan", seeIt: "İlanı gör" },
  ar: { alert: "تنبيه Re-Bali", newListing: "إعلان جديد يطابق بحثك", seeIt: "عرض الإعلان" },
  hi: { alert: "Re-Bali अलर्ट", newListing: "आपकी खोज से मेल खाता नया विज्ञापन", seeIt: "विज्ञापन देखें" },
  ja: { alert: "Re-Bali アラート", newListing: "検索に一致する新しいリスト", seeIt: "リストを見る" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fonnte = Deno.env.get("FONNTE_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { listing_id, title, description, category, price, seller_id, extra_fields } = await req.json();

    if (!listing_id || !title) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract model/brand from extra_fields
    const extraText = extra_fields
      ? Object.values(extra_fields).filter((v): v is string => typeof v === "string").join(" ")
      : "";

    // Get all active saved searches
    const { data: savedSearches } = await supabase
      .from("saved_searches")
      .select("id, user_id, keyword")
      .eq("is_active", true);

    if (!savedSearches || savedSearches.length === 0) {
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchText = `${title} ${description} ${category} ${extraText}`.toLowerCase();
    let matchedCount = 0;

    for (const search of savedSearches) {
      if (search.user_id === seller_id) continue;

      const keywords = search.keyword.toLowerCase().split(/\s+/);
      const matches = keywords.every((kw: string) => searchText.includes(kw));
      if (!matches) continue;

      const { data: existing } = await supabase
        .from("search_notifications")
        .select("id")
        .eq("saved_search_id", search.id)
        .eq("listing_id", listing_id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { data: vipAddon } = await supabase
        .from("user_addons")
        .select("id")
        .eq("user_id", search.user_id)
        .eq("addon_type", "vip")
        .eq("active", true)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (!vipAddon || vipAddon.length === 0) continue;

      // Create in-app notification
      await supabase.from("search_notifications").insert({
        user_id: search.user_id,
        saved_search_id: search.id,
        listing_id: listing_id,
      });

      matchedCount++;

      // Send push notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: search.user_id,
            title: `🔔 "${search.keyword}"`,
            body: `${title} — ${new Intl.NumberFormat("id-ID").format(price)} IDR`,
            url: `/listing/${listing_id}`,
            tag: `search-${search.id}`,
          }),
        });
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }

      // Send WhatsApp notification (translated, with image like message notifications)
      if (fonnte) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("whatsapp, display_name, preferred_lang")
          .eq("id", search.user_id)
          .single();

        if (profile?.whatsapp) {
          const cleanTarget = profile.whatsapp.replace(/[^0-9]/g, "");
          const lang = profile.preferred_lang || "en";
          const tmpl = ALERT_TEMPLATES[lang] || ALERT_TEMPLATES.en;

          // Translate listing title to user's language
          const translatedTitle = await translateText(title, lang);

          // Get listing image
          const { data: listingImage } = await supabase
            .from("listing_images")
            .select("storage_path")
            .eq("listing_id", listing_id)
            .order("sort_order", { ascending: true })
            .limit(1)
            .single();

          const imageUrl = listingImage
            ? `${supabaseUrl}/storage/v1/object/public/listings/${listingImage.storage_path}`
            : "";

          const listingUrl = `https://re-bali.com/listing/${listing_id}`;
          const priceFormatted = new Intl.NumberFormat("id-ID").format(price);

          const waMessage = `🔔 *${tmpl.alert}*

${tmpl.newListing} "${search.keyword}" :

📦 *${translatedTitle}*
💰 ${priceFormatted} IDR

👉 ${tmpl.seeIt}: ${listingUrl}`;

          const formData = new FormData();
          formData.append("target", cleanTarget);
          formData.append("message", waMessage);
          formData.append("countryCode", "0");
          if (imageUrl) {
            formData.append("url", imageUrl);
          }

          try {
            const fonnteRes = await fetch("https://api.fonnte.com/send", {
              method: "POST",
              headers: { Authorization: fonnte },
              body: formData,
            });
            const result = await fonnteRes.json();
            console.log(`WA sent to ${cleanTarget}:`, JSON.stringify(result));

            await supabase
              .from("search_notifications")
              .update({ notified_wa: true })
              .eq("saved_search_id", search.id)
              .eq("listing_id", listing_id);
          } catch (waErr) {
            console.error("Fonnte error:", waErr);
          }
        }
      }
    }

    console.log(`Matched ${matchedCount} saved searches for listing ${listing_id}`);

    return new Response(JSON.stringify({ ok: true, matched: matchedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-saved-searches error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});