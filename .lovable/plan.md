

# Re-Bali Economy V2 -- Complete Overhaul

This plan restructures the trust score, badges, points economy, and shop to match the Indonesia-optimized strategy you described. It's a large but systematic update across 4 layers: database, edge functions, frontend components, and i18n.

---

## Summary of Changes

### 1. Trust Score -- New Formula

**Current** formula uses arbitrary weights (1pt/day, 5pts/listing, etc.) with thresholds at 10/30.

**New** formula:

| Factor | Gain | Max |
|--------|------|-----|
| Account age | 0.5 pt/day | +20 |
| Active listings | 3 pts/listing | +15 |
| Completed deals | 5 pts/deal | +20 |
| Positive reviews (4+) | 3 pts each | +20 |
| WhatsApp verified | +10 | +10 |
| Identity verified | +15 | +15 |

| Penalty | Points |
|---------|--------|
| Unresolved report | -10 |
| Fake listing detected (3 scam reports) | -20 |
| VPN/proxy abuse | -10 |
| Multi-device abuse | -15 |

**New thresholds**: 70-100 = "Safe", 40-69 = "Standard", 0-39 = "Risky"

Public-facing labels change from "low/medium/high risk" to "Safe / Standard / Risky" (more positive framing). The exact numeric score stays internal (not shown publicly), only the label is displayed.

### 2. Badges -- New Generation

**Keep existing**: newMember, activeMember, veteran, elder, whatsappVerified, identityVerified

**Remove**: firstSeller, activeSeller, communicator, superCommunicator, wellRated, topSeller

**Add new badges**:

| Badge | Icon | Condition |
|-------|------|-----------|
| safeSeller | ShieldCheck | Trust score >= 70 |
| trustedPro | Medal | Trust score >= 85 AND >= 10 completed deals |
| firstDeal | Handshake | 1 completed deal |
| fiveDeals | Target | 5 completed deals |
| twentyDeals | Flame | 20 completed deals |
| fiftyDeals | Trophy | 50 completed deals |

This requires counting completed deals (conversations where `deal_closed = true AND buyer_confirmed = true`).

### 3. Points -- New Economy

**Badge point values (one-time sync)**:

| Badge | Points |
|-------|--------|
| WhatsApp Verified | 20 |
| Identity Verified | 40 |
| First Listing (newMember equivalent, keep firstSeller internally for points only) | 10 |
| First Deal | 20 |
| 5 Deals | 30 |
| 20 Deals | 50 |
| Safe Seller | 25 |
| Trusted Pro | 60 |

**Dynamic earning** (new concept -- points earned automatically on events):

| Action | Points |
|--------|--------|
| Completed deal (both confirmed) | 5 pts |
| 5-star review received | 3 pts |
| Validated report against scammer | 10 pts |

Monthly cap: 150 pts from dynamic earnings (anti-farming).

This requires a new tracking mechanism in the `manage-points` edge function and a `monthly_dynamic_earned` counter.

### 4. Shop -- 5 Products

| Product | Cost | Duration | Effect |
|---------|------|----------|--------|
| Boost 48h | 40 pts | 48h | Top of category results, "Boosted" badge on card |
| Boost Premium (Homepage) | 80 pts | 48h | Featured on homepage section, larger card, "Featured" badge |
| VIP 30j | 120 pts | 30 days | VIP badge, +10% search priority, 1 free Boost included |
| Extra 5 Listings | 90 pts | 30 days | +5 listing slots (max 2 packs) |
| Protection Boost | 150 pts | 30 days | "Priority Seller" badge, +20% organic visibility |

### 5. Gamification UX

- Show "You are X pts away from [next product]" nudge in the shop
- "Complete 1 more deal to earn 5 pts" suggestion

---

## Technical Implementation Plan

### Step 1: Database Migration

Add a `monthly_dynamic_earned` column to `user_points` to track the monthly cap:

```sql
ALTER TABLE public.user_points 
  ADD COLUMN IF NOT EXISTS monthly_dynamic_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS month_reset text NOT NULL DEFAULT to_char(now(), 'YYYY-MM');
```

Update the `check_listing_limit` function to account for `extra_listings` addons (check `user_addons` for active `extra_listings` and add `extra_slots` to the max).

### Step 2: Update `calculate-trust-score` Edge Function

- Change formula weights to match new table above
- Count completed deals via `conversations` where `deal_closed = true AND buyer_confirmed = true` and user is either buyer or seller
- Change thresholds: `>= 70` = low risk (Safe), `>= 40` = medium, `< 40` = high (Risky)
- Add "fake listing" penalty: count listings archived due to 3+ scam reports

### Step 3: Update `manage-points` Edge Function

Major rewrite:

- **New badge list** with updated point values matching the new badges
- **`sync_badges`**: Update badge detection logic to include deal-based badges (query `conversations` for completed deals count) and trust-score-based badges (safeSeller, trustedPro)
- **`award_dynamic`** new action: Called after deal completion, 5-star review, or validated report. Checks monthly cap before awarding.
- **New shop products**: Update `ADDON_COSTS` and `ADDON_DURATIONS` for 5 products: `boost` (40), `boost_premium` (80), `vip` (120), `extra_listings` (90), `protection` (150)
- **Admin actions**: Keep `admin_get_all_points` and `admin_set_balance` as-is

### Step 4: Update `UserBadges.tsx`

- Replace badge definitions with new set (keep age/verification badges, add deal + trust badges)
- Add `completedDeals` and `trustScore` to `BadgeContext`
- Query completed deals count from `conversations`
- Query user's trust score from `profiles`

### Step 5: Update `TrustIndicator.tsx`

- Change labels from "Low risk / Medium risk / High risk" to "Safe / Standard / Risky"
- Adjust color thresholds: green >= 70, amber >= 40, red < 40

### Step 6: Update `TrustBadges.tsx` (Explanation Page)

- Update `TRUST_FACTORS` with new weights
- Update `BADGE_LIST` with new badges
- Update `POINTS_BADGES` with new values
- Add new shop products (5 instead of 3)
- Add "Dynamic Earning" section explaining deal/review/report rewards + monthly cap
- Update penalty descriptions

### Step 7: Update `PointsShop.tsx`

- Add 2 new products (boost_premium, protection) to `ADDON_CONFIG`
- Add gamification nudge: "You are X pts away from [cheapest affordable addon]"
- Boost Premium needs a listing selector dialog too (like regular boost)
- Show monthly dynamic points status (X/150 earned this month)

### Step 8: Update `ListingCard.tsx`

- Show "Boosted" badge on boosted listings (query `user_addons` for active boost on that listing_id)
- Show "Featured" badge for premium boosted listings

### Step 9: Update `Home.tsx`

- Add "Featured Listings" section showing listings with active `boost_premium` addon

### Step 10: Update `Browse.tsx`

- Sort boosted listings higher in results (query active boosts and sort accordingly)

### Step 11: Update `check_listing_limit` DB Function

- Account for active `extra_listings` addons: query `user_addons` for active `extra_listings` and add `extra_slots` to `max_listings`

### Step 12: i18n Updates (All 12 Languages)

Update all translation files with:
- New badge names and descriptions (safeSeller, trustedPro, firstDeal, fiveDeals, twentyDeals, fiftyDeals)
- New trust level labels (Safe / Standard / Risky)
- New shop product names and descriptions (boost_premium, protection)
- Dynamic earning explanations
- Gamification nudge texts
- Remove old badge translations (communicator, superCommunicator, etc.) or keep for backward compat

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/...` | New migration for `monthly_dynamic_earned` column + update `check_listing_limit` function |
| `supabase/functions/calculate-trust-score/index.ts` | Rewrite with new formula |
| `supabase/functions/manage-points/index.ts` | Major update: new badges, new shop items, dynamic earning |
| `src/components/UserBadges.tsx` | New badge definitions + deal/trust queries |
| `src/components/TrustIndicator.tsx` | New thresholds + labels |
| `src/pages/TrustBadges.tsx` | Full content update for new system |
| `src/pages/PointsShop.tsx` | 5 products + gamification nudge + dynamic earnings display |
| `src/components/ListingCard.tsx` | Boosted/Featured badges |
| `src/pages/Home.tsx` | Featured Listings section |
| `src/pages/Browse.tsx` | Boost priority in sort |
| All 12 `src/i18n/translations/*.json` | New keys for badges, shop, trust labels |

---

## What is NOT Included (Future Phases)

- **IAP / Point Pack Purchases with IDR**: Requires payment gateway integration (Midtrans, Xendit, etc.). This will be a separate project phase.
- **Points-to-Cash Conversion**: Pro-only feature for later.
- **PRO Seller SaaS Plan**: Direct IDR subscription -- separate monetization layer.

