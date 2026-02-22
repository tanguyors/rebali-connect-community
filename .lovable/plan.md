
# Fix Mobile WhatsApp Contact Drawer

## Problem
1. The mobile drawer shows two buttons: "Send via WhatsApp" and "Send a message" (in-app) -- the in-app message button should be removed.
2. The WhatsApp button uses `asChild` with an `<a>` tag which may not work properly on mobile -- needs to be a direct button with `window.open`.

## Changes

### File: `src/pages/ListingDetail.tsx`

**1. Remove the in-app message button (lines 669-675)**
Delete the entire "In-app message" button block from the drawer.

**2. Fix the WhatsApp button (lines 653-667)**
Replace the `asChild` + `<a>` approach with a regular `<Button>` that uses `window.open()` on click. This ensures the click handler fires reliably on mobile:

```tsx
<Button 
  className="w-full gap-2 rounded-full font-bold text-base h-12" 
  onClick={() => {
    const waUrl = `https://wa.me/${REBALI_WA_NUMBER}?text=${encodeURIComponent(`RB|L=${listing.id}|B=${user?.id || ''}| ${customMessage}`)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (user) supabase.from('whatsapp_click_logs').insert({ listing_id: listing.id, user_id: user.id });
    setMobileContactOpen(false);
  }}
>
  <MessageCircle className="h-5 w-5" />
  {t('listing.sendViaWhatsApp')}
</Button>
```

This keeps only the WhatsApp button and makes the click action work reliably on mobile devices, opening WhatsApp with the proxy message token (`RB|L=...|B=...|`) as previously implemented.
