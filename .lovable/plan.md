
# Systeme de Badges et Indice de Confiance

## Objectif
Creer un systeme de badges visuels attribues automatiquement aux utilisateurs en fonction de leur activite (anciennete, annonces, messages, avis) et afficher un indice de confiance clair sur les profils et les annonces.

## Badges proposes

| Badge | Condition | Icone |
|-------|-----------|-------|
| Nouveau membre | Inscription < 7 jours | Sprout |
| Membre actif | Inscription > 30 jours | Clock |
| Veteran | Inscription > 6 mois | Award |
| Ancien | Inscription > 1 an | Crown |
| Premier vendeur | 1+ annonce publiee | Package |
| Vendeur actif | 5+ annonces publiees (cumul) | TrendingUp |
| Communicant | 10+ messages envoyes | MessageCircle |
| Super communicant | 50+ messages envoyes | MessagesSquare |
| Bien note | Note moyenne >= 4/5 avec 3+ avis | Star |
| Top vendeur | Note >= 4.5/5 avec 10+ avis | Trophy |
| WhatsApp verifie | Telephone verifie | CheckCircle |
| Identite verifiee | Vendeur verifie | ShieldCheck |

## Plan technique

### 1. Pas de nouvelle table DB
Les badges seront calcules dynamiquement cote client a partir des donnees existantes (profil, compteurs). Cela evite la complexite d'une table supplementaire et de la synchronisation. Les donnees necessaires existent deja :
- `profiles.created_at` pour l'anciennete
- `profiles.phone_verified` et `profiles.is_verified_seller` pour les verifications
- Comptage des `listings` pour les badges vendeur
- Comptage des `messages` pour les badges communicant
- `reviews` pour la note moyenne

### 2. Nouveau composant `src/components/UserBadges.tsx`
- Recoit un `userId` en prop
- Utilise `react-query` pour fetcher les compteurs necessaires (listings total, messages envoyes, reviews)
- Calcule les badges applicables
- Affiche une rangee de badges colores avec tooltips

### 3. Nouveau composant `src/components/TrustIndicator.tsx`
- Recoit le `trust_score` et `risk_level` du profil
- Affiche une jauge visuelle (barre de progression coloree) avec le score sur 100
- Couleur : vert (>= 60), orange (30-59), rouge (< 30)

### 4. Integration dans les pages existantes
- **Profile.tsx** : Ajouter `UserBadges` et `TrustIndicator` dans la carte header, sous les stats existantes
- **SellerProfile.tsx** : Ajouter `UserBadges` et `TrustIndicator` dans la carte vendeur
- **ListingCard.tsx** : Optionnel - on pourrait afficher 1-2 badges cles (Verifie, Veteran) mais pour garder la card legere, on se concentre sur les profils

### 5. Edge function `calculate-trust-score` mise a jour
- Ajouter le facteur "messages envoyes" (+1 par tranche de 10 messages, max 10 points)
- Ajouter le facteur "avis positifs" (+2 par avis >= 4 etoiles, max 15 points)
- Recalcul des poids pour equilibrer le score total sur 100

### 6. Traductions
- Ajouter les cles `badges.*` dans `en.json` et `fr.json` (les autres langues en fallback anglais)

## Fichiers a creer
- `src/components/UserBadges.tsx`
- `src/components/TrustIndicator.tsx`

## Fichiers a modifier
- `src/pages/Profile.tsx` - integration des badges et jauge
- `src/pages/SellerProfile.tsx` - integration des badges et jauge
- `src/i18n/translations/en.json` - nouvelles cles badges
- `src/i18n/translations/fr.json` - traductions francaises
- `supabase/functions/calculate-trust-score/index.ts` - ajout facteurs messages et avis
