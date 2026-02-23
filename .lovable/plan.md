

# Evolution du systeme "Deal Conclu" -- Rating bidirectionnel dans la conversation

## Ce qui change par rapport a l'implementation actuelle

L'implementation actuelle ferme immediatement la conversation du deal et redirige l'acheteur vers SellerProfile pour noter. Le nouveau flux garde la conversation ouverte pour permettre un echange de notes bidirectionnel directement dans la conversation.

## Nouveau flux complet

```text
1. Vendeur clique "Deal conclu" + confirme via popup
2. L'annonce passe en statut "sold" (disparait des recherches)
3. Toutes les AUTRES conversations pour cette annonce sont fermees immediatement
4. La conversation du deal RESTE OUVERTE (deal_closed = true)
5. L'acheteur voit un bandeau + bouton "Confirmer le deal"
6. L'acheteur confirme -> buyer_confirmed = true
7. Les deux parties peuvent se noter mutuellement (etoiles + commentaire) directement dans la conversation
8. Quand les deux ont note -> la conversation se ferme definitivement
9. Si l'acheteur ne confirme pas sous 7 jours -> fermeture automatique (cron job)
```

## Plan technique

### 1. Migration base de donnees

**Table `conversations`** -- ajouter 2 nouvelles colonnes (en plus des 3 existantes) :
- `buyer_confirmed` (boolean, default false)
- `buyer_confirmed_at` (timestamptz, nullable)

**Table `reviews`** -- modifier pour supporter le rating bidirectionnel :
- Supprimer la contrainte UNIQUE sur `conversation_id` (car 2 reviews par conversation : acheteur -> vendeur ET vendeur -> acheteur)
- Ajouter une contrainte UNIQUE sur `(conversation_id, reviewer_id)` (un seul avis par personne par conversation)
- Ajouter une colonne `reviewed_user_id` (uuid) pour savoir qui est note (remplace `seller_id` dans la logique -- on garde `seller_id` pour la retrocompatibilite mais `reviewed_user_id` sera le vrai destinataire)

**Mettre a jour la politique RLS INSERT de `reviews`** pour permettre aussi au vendeur de noter l'acheteur :
- Le reviewer peut etre le buyer OU le seller de la conversation
- `reviewed_user_id` doit etre l'autre partie
- `buyer_confirmed = true` obligatoire (les deux ont confirme)
- Les conditions existantes restent (comptes > 7 jours, messages des deux cotes)

### 2. Modifications dans Messages.tsx

**Etape vendeur -- "Deal conclu" (deja en place, a ajuster)** :
- Le bouton reste comme aujourd'hui
- A la confirmation : ne plus fermer la conversation courante (retirer le blocage input quand deal_closed est true sur la conversation du deal)

**Etape acheteur -- "Confirmer le deal"** :
- Quand `deal_closed = true` et `buyer_confirmed = false` et l'utilisateur est l'acheteur :
  - Afficher un bandeau jaune "Le vendeur a marque ce deal comme conclu. Confirmez-vous ?"
  - Bouton "Confirmer le deal" + bouton "Contester"
- Au clic "Confirmer" : update `buyer_confirmed = true, buyer_confirmed_at = now()`

**Etape notation -- Formulaire inline** :
- Quand `buyer_confirmed = true` :
  - Afficher une section de notation au-dessus de l'input (etoiles 1-5 + commentaire + bouton "Envoyer ma note")
  - Visible pour chaque partie tant qu'elle n'a pas note
  - Quand un utilisateur soumet sa note : inserer dans `reviews` + inserer un message systeme ("X a laisse un avis")
  - Quand les DEUX ont note : fermer la conversation (`relay_status = 'closed'`) + message systeme "Transaction terminee"

**Zone input** :
- Conversation ouverte normalement si `deal_closed = false`
- Conversation ouverte si `deal_closed = true` mais `buyer_confirmed = false` (pour permettre la discussion avant confirmation)
- Input desactive une fois que l'utilisateur a note (seule la section notation reste active pour l'autre partie)
- Conversation fermee definitivement quand les deux ont note

### 3. Cron job -- Auto-fermeture a 7 jours

Creer une Edge Function `close-expired-deals` :
- Chercher les conversations ou `deal_closed = true` ET `buyer_confirmed = false` ET `deal_closed_at < now() - 7 jours`
- Les fermer automatiquement (`relay_status = 'closed'`)
- Inserer un message systeme "Cette conversation a ete fermee automatiquement apres 7 jours sans confirmation"
- Planifier via pg_cron (quotidien a minuit, comme l'expiration des annonces)

### 4. Suppression du rating depuis SellerProfile

Retirer la logique de review depuis SellerProfile.tsx :
- Supprimer le bouton "Laisser un avis" et le dialog
- Supprimer les queries `dealConversation` et `existingReview`
- Garder l'affichage des avis existants (lecture seule) avec le badge "Acheteur verifie"
- Le rating se fait desormais exclusivement dans la conversation

### 5. Traductions

Nouvelles cles :
- `messages.buyerConfirmDeal` : "Confirm the deal"
- `messages.buyerConfirmBanner` : "The seller marked this deal as concluded. Do you confirm?"
- `messages.contest` : "Contest"
- `messages.rateUser` : "Rate this transaction"
- `messages.ratingSubmitted` : "Your rating has been submitted"
- `messages.transactionComplete` : "Transaction completed. Both parties have rated."
- `messages.autoClosedExpired` : "Automatically closed after 7 days"
- `messages.waitingBuyerConfirm` : "Waiting for buyer confirmation..."
- `messages.waitingRatings` : "Rate this transaction to close the deal"

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Colonnes `buyer_confirmed`, `buyer_confirmed_at` + contrainte UNIQUE reviews + RLS |
| `src/pages/Messages.tsx` | Bandeau confirmation acheteur + formulaire notation inline + logique fermeture |
| `src/pages/SellerProfile.tsx` | Retirer le bouton "Laisser un avis" (garder l'affichage) |
| `src/i18n/translations/en.json` | Nouvelles cles |
| `src/i18n/translations/fr.json` | Traductions |
| `supabase/functions/close-expired-deals/index.ts` | Nouvelle Edge Function pour fermeture auto a 7 jours |

## Securite

- Le vendeur seul peut initier le deal (verifie client + RLS)
- L'acheteur seul peut confirmer (verifie client + RLS)
- Chaque partie ne peut noter que l'AUTRE partie (RLS enforce)
- Un seul avis par personne par conversation (contrainte UNIQUE)
- Comptes < 7 jours bloques (RLS)
- Messages reels requis des deux cotes (RLS)
- Fermeture automatique apres 7 jours sans confirmation (cron)

