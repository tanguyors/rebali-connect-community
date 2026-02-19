

# Re-Bali -- Plan complet pour finaliser la web app

## Etat actuel

L'app a deja une bonne base : schema Supabase (6 tables), auth, i18n 8 langues, pages principales. Mais il manque des elements cles pour etre "prete et fonctionnelle" style Le Bon Coin.

## Ce qui va etre fait

### 1. Slogan anime "Re-" dans le Hero (toutes les langues)

Le hero va afficher un mot qui change en boucle avec une animation de typing/fade :

- **EN**: Re-Use, Re-Sell, Re-Home, Re-Discover
- **FR**: Re-Utilise, Re-Vends, Re-Trouve, Re-Decouvre
- **ID**: Re-Pakai, Re-Jual, Re-Temukan, Re-Gunakan
- **ES**: Re-Usa, Re-Vende, Re-Encuentra, Re-Descubre
- **ZH**: Re-用, Re-卖, Re-找, Re-发现
- **DE**: Re-Nutze, Re-Verkaufe, Re-Finde, Re-Entdecke
- **NL**: Re-Gebruik, Re-Verkoop, Re-Vind, Re-Ontdek
- **RU**: Re-Используй, Re-Продай, Re-Найди, Re-Открой

Le composant Hero affichera "Re-Bali" en grand, puis en dessous un mot "Re-XXX" qui defile en boucle avec un effet typewriter ou fade, suivi du sous-titre actuel.

### 2. Seed data : 20 listings realistes pour Bali

Insertion SQL de 20 annonces couvrant toutes les categories et zones :
- Villa a Canggu, scooter a Ubud, canape a Seminyak, machine a cafe pro a Denpasar, etc.
- Avec des prix realistes en IDR/USD
- Pas d'images (storage pas seedable par SQL), mais les listings seront visibles avec le placeholder

### 3. Ameliorations style Le Bon Coin

- **Browse** : ajouter un filtre prix min/max (comme LBC)
- **ListingCard** : ajouter la date relative ("il y a 2h", "il y a 3 jours") avec date-fns
- **ListingDetail** : ajouter un bouton "Partager" (copier le lien)
- **Home** : restructurer pour mettre les categories en bande horizontale scrollable (comme LBC mobile), CTA plus visible

### 4. Corrections et polish

- La traduction du slogan "Re-" dans les 8 fichiers JSON
- Ajouter les cles i18n manquantes pour les nouveaux elements
- Corriger le footer : copyright 2025 -> dynamique
- Le bouton location dans Browse doit utiliser les traductions `locations.xxx`
- S'assurer que le `NotFound` est dans le Layout

---

## Details techniques

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/i18n/translations/*.json` (x8) | Ajout des cles `home.heroWords` (tableau de mots Re-) |
| `src/pages/Home.tsx` | Composant hero anime avec mots qui defilent, categories en scroll horizontal |
| `src/components/ListingCard.tsx` | Date relative avec `date-fns` (formatDistanceToNow) |
| `src/pages/Browse.tsx` | Filtre prix min/max, utiliser `t('locations.xxx')` pour les noms |
| `src/pages/ListingDetail.tsx` | Bouton partager (copy to clipboard) |
| Migration SQL | INSERT de 20 listings + translations |

### Nouveau composant

- `src/components/AnimatedHeroText.tsx` : affiche les mots "Re-XXX" en boucle avec un interval de 2s et une animation CSS fade-in/out

### Seed data (migration SQL)

On va creer un profil "seed" systeme puis inserer 20 listings avec des titres/descriptions realistes pour Bali, repartis sur les 7 categories et 10+ zones differentes. Les `listing_translations` seront creees pour EN uniquement (les autres en "Pending translation").

