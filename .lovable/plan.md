
# Traduction automatique des annonces et recherche multilingue

## Objectif
Permettre que chaque annonce soit automatiquement traduite dans les 8 langues supportees, et que la recherche trouve les annonces quelle que soit la langue de publication ou de recherche.

## Ce qui existe aujourd'hui
- A la creation d'une annonce, des "placeholders" sont inseres dans `listing_translations` avec le texte "Pending translation" pour toutes les langues sauf l'anglais
- La recherche ne filtre que sur `title_original` et `description_original` (langue de publication uniquement)
- Aucune edge function de traduction n'existe

## Plan d'implementation

### 1. Edge Function `translate-listing`
Creer une nouvelle edge function qui :
- Recoit un `listing_id` en parametre
- Lit le `title_original` et `description_original` depuis la table `listings`
- Utilise l'API Google Translate (gratuite via endpoint public) pour traduire le titre et la description dans les 7 autres langues
- Met a jour les lignes existantes dans `listing_translations` avec les vraies traductions

L'appel se fera via l'endpoint Google Translate public (pas besoin de cle API).

### 2. Appel automatique apres publication
Modifier `CreateListing.tsx` pour :
- Apres l'insertion de l'annonce et des placeholders, appeler l'edge function `translate-listing` en arriere-plan (sans bloquer l'utilisateur)
- Meme chose lors de l'edition d'une annonce

### 3. Recherche multilingue dans Browse
Modifier la requete de recherche dans `Browse.tsx` pour :
- D'abord chercher les `listing_id` correspondants dans `listing_translations` (titre et description dans toutes les langues)
- Combiner avec la recherche sur `title_original` / `description_original`
- Cela se fera via une fonction SQL `search_listings` qui effectue un `UNION` entre les deux sources

### 4. Fonction SQL `search_listings`
Creer une fonction de base de donnees qui :
- Prend un terme de recherche en parametre
- Cherche dans `listings.title_original`, `listings.description_original` ET `listing_translations.title`, `listing_translations.description`
- Retourne les IDs distincts des annonces correspondantes

## Details techniques

### Edge Function `translate-listing`
```text
POST /translate-listing
Body: { listing_id: "uuid" }

1. Lire listing (title_original, description_original, lang_original)
2. Pour chaque langue cible (sauf lang_original):
   - Traduire titre et description via Google Translate
   - UPDATE listing_translations SET title=..., description=... WHERE listing_id=... AND lang=...
3. Retourner succes
```

### Fonction SQL pour la recherche
```text
CREATE FUNCTION search_listings(search_term text)
RETURNS SETOF uuid AS $$
  SELECT DISTINCT l.id FROM listings l
  WHERE l.status = 'active'
    AND (l.title_original ILIKE '%' || search_term || '%'
         OR l.description_original ILIKE '%' || search_term || '%')
  UNION
  SELECT DISTINCT lt.listing_id FROM listing_translations lt
  JOIN listings l ON l.id = lt.listing_id
  WHERE l.status = 'active'
    AND (lt.title ILIKE '%' || search_term || '%'
         OR lt.description ILIKE '%' || search_term || '%')
$$
```

### Modification de Browse.tsx
- Si un terme de recherche est present, appeler `supabase.rpc('search_listings', { search_term })` pour obtenir les IDs, puis filtrer avec `.in('id', matchingIds)`
- Si pas de recherche, comportement inchange

### Fichiers concernes
- **Nouveau** : `supabase/functions/translate-listing/index.ts`
- **Migration SQL** : nouvelle fonction `search_listings`
- **Modifie** : `src/pages/CreateListing.tsx` (appel traduction apres publication/edition)
- **Modifie** : `src/pages/Browse.tsx` (recherche multilingue via RPC)
- **Modifie** : `supabase/config.toml` (enregistrer la nouvelle edge function)
