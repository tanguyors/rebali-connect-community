

# Update REBALI_WA_NUMBER

Replace the placeholder WhatsApp number with your actual number.

## Change

**File:** `src/lib/constants.ts` (line 92)

- Current: `export const REBALI_WA_NUMBER = '6281234567890';`
- New: `export const REBALI_WA_NUMBER = '33745661257';`

Your number `+33745661257` is stored without the `+` prefix, as required by the WhatsApp API deep link format (`wa.me/33745661257`).

## Remaining manual step (outside Lovable)

After this change, you still need to configure the **Fonnte webhook**:
1. Go to [my.fonnte.com](https://my.fonnte.com)
2. Select your device
3. In the **Webhook** section, paste: `https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/wa-webhook`
4. Save

