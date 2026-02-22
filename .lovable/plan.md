
# Ajout de 4 nouvelles langues : Turc, Arabe, Hindi, Japonais

## Objectif
Ajouter le support complet des langues Turc (tr), Arabe (ar), Hindi (hi) et Japonais (ja) dans toute l'application, incluant l'interface utilisateur, la traduction automatique des annonces et la recherche multilingue.

## Fichiers a modifier

### 1. Creer les fichiers de traduction
- `src/i18n/translations/tr.json` -- Traduction turque de toutes les cles (345 lignes, meme structure que en.json)
- `src/i18n/translations/ar.json` -- Traduction arabe
- `src/i18n/translations/hi.json` -- Traduction hindi
- `src/i18n/translations/ja.json` -- Traduction japonaise

### 2. Registre des langues -- `src/i18n/index.ts`
- Importer les 4 nouveaux fichiers JSON
- Ajouter les 4 langues dans `SUPPORTED_LANGUAGES` :
  - `{ code: 'tr', name: 'Turkce', flag: '🇹🇷' }`
  - `{ code: 'ar', name: 'العربية', flag: '🇸🇦' }`
  - `{ code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }`
  - `{ code: 'ja', name: '日本語', flag: '🇯🇵' }`
- Ajouter les 4 codes dans l'objet `translations`

### 3. Texte anime du hero -- `src/components/AnimatedHeroText.tsx`
- Ajouter les entrees pour `tr`, `ar`, `hi`, `ja` dans `HERO_WORDS`

### 4. Traduction automatique des annonces -- `supabase/functions/translate-listing/index.ts`
- Ajouter `"tr"`, `"ar"`, `"hi"`, `"ja"` dans le tableau `TARGET_LANGS`

### 5. Aucun changement necessaire pour :
- Le selecteur de langue (`LanguageSwitcher.tsx`) : il lit dynamiquement `SUPPORTED_LANGUAGES`
- La recherche multilingue (`search_listings` SQL) : elle cherche deja dans toutes les lignes de `listing_translations`, les nouvelles langues seront incluses automatiquement
- Le contexte de langue (`LanguageContext.tsx`) : le type `LanguageCode` est derive automatiquement de `SUPPORTED_LANGUAGES`

## Details techniques

Les 4 fichiers JSON de traduction contiendront exactement la meme structure que `en.json` avec toutes les cles traduites dans la langue cible. Chaque fichier fait environ 345 lignes.

Apres deploiement, les annonces existantes ne seront pas automatiquement traduites dans les nouvelles langues. Pour les traduire, il faudrait re-appeler la fonction `translate-listing` pour chaque annonce existante (optionnel, peut etre fait plus tard via un script admin).
