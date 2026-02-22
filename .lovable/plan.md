
# Routage des reponses vendeur/acheteur avec plusieurs conversations

## Statut : IMPLÉMENTÉ ✅

## Solution

Chaque message relayé inclut un **code court** (`[#A]`, `[#B]`...) propre au destinataire. Pour répondre à une conversation spécifique, il suffit de préfixer le message avec `#A`, `#B`, etc.

- `seller_short_code` : code visible par le vendeur (unique parmi ses conversations actives)
- `buyer_short_code` : code visible par l'acheteur (unique parmi ses conversations actives)

### Comportement
- **1 seule conversation active** : routage automatique, pas besoin de code
- **Plusieurs conversations** : message d'aide envoyé listant les codes
- **Code invalide** : message d'erreur avec la liste des codes valides
- **Nouvelles conversations** : codes attribués automatiquement à la création
- **Anciennes conversations** : codes attribués au prochain message

### Fichiers modifiés
- `supabase/functions/wa-webhook/index.ts` : logique complète de routage par short_code
- Migration SQL : colonnes `seller_short_code` et `buyer_short_code` sur `conversations`
