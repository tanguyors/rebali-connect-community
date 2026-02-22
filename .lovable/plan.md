
# Correction du code pays OTP WhatsApp

## Probleme identifie

Dans `supabase/functions/send-otp/index.ts` (ligne 112), le code pays est fixe a `"62"` (Indonesie). Fonnte utilise ce parametre pour reformater le numero, ce qui ecrase le prefixe international saisi par l'utilisateur.

Resultat : un numero `+33775855440` devient `+6233775855440`.

## Solution

Deux changements necessaires :

### 1. Edge Function `send-otp/index.ts`

- Extraire dynamiquement le code pays depuis le numero de telephone fourni (qui commence par `+`)
- Si le numero commence par `+`, extraire le code pays automatiquement et envoyer le numero sans le `+` a Fonnte
- Ne plus coder en dur `"62"`

Logique :
```text
+33775855440  -> countryCode = "33", target = "775855440"
+6281234567   -> countryCode = "62", target = "81234567"
+1234567890   -> countryCode = "1",  target = "234567890"
```

Concretement, on utilisera une liste des prefixes pays connus (1, 7, 20-69, etc.) pour determiner la bonne coupure, ou plus simplement, on enverra le numero complet avec le `+` a Fonnte et on supprimera le parametre `countryCode` (Fonnte accepte les numeros au format international complet).

**Approche retenue** : envoyer le numero tel quel au format international (avec `+`) dans `target` et retirer le parametre `countryCode`. C'est la methode la plus fiable et recommandee par Fonnte pour les numeros internationaux.

### 2. Verification du format cote client

- Verifier dans la page Profil que le champ WhatsApp exige bien un format commencant par `+` suivi du code pays (ex: `+33`, `+62`, `+1`)
- Ajouter une validation basique si elle n'existe pas deja

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `supabase/functions/send-otp/index.ts` | Supprimer `countryCode: "62"`, envoyer le numero au format international complet |
| `src/pages/Profile.tsx` | Verifier que la validation du champ WhatsApp impose le format `+XX...` |

## Impact

- Zero risque de regression : les numeros indonesiens `+62...` continueront de fonctionner
- Tous les numeros internationaux seront desormais supportes
- Aucun cout supplementaire
