
# Next Steps - Polish and Bug Fixes

## Issues to Fix

### 1. Location translations missing in CreateListing
The location dropdown in the create listing form (step 1, line 208) shows raw values like "nusa_dua" instead of translated names. Will use `t('locations.xxx')` like Browse already does.

### 2. Location translation missing in ListingDetail
The listing detail page (line 108) shows the raw `location_area` value instead of using `t('locations.xxx')`.

### 3. Location translation missing in MyListings
The MyListings page (line 59) shows raw `listing.location_area`.

### 4. NotFound route nesting fix
In App.tsx line 49, the `NotFound` route closing tag is improperly indented -- need to verify it's correctly nested inside the Layout route.

### 5. Footer copyright uses hardcoded English text
Line 42 of Footer.tsx has `All rights reserved.` hardcoded instead of using the translation key `t('footer.copyright')`.

## Technical Details

| File | Change |
|---|---|
| `src/pages/CreateListing.tsx` line 208 | Replace raw location display with `t('locations.${l}')` |
| `src/pages/ListingDetail.tsx` line 108 | Replace `listing.location_area` with `t('locations.${listing.location_area}')` |
| `src/pages/MyListings.tsx` line 59 | Replace `listing.location_area` with `t('locations.${listing.location_area}')` |
| `src/App.tsx` line 49 | Fix NotFound route indentation to ensure proper nesting |
| `src/components/Footer.tsx` line 42 | Use `t('footer.copyright')` or build dynamic string with translation |

These are all small targeted fixes -- no new files needed.
