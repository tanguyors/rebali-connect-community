

# Verification Identite + Corrections

## 1. Section "Devenir Vendeur Verifie" dans Profile.tsx

Ajouter une nouvelle carte entre la section WhatsApp et la section Securite :

- Si `profile.is_verified_seller === true` : afficher un badge "Vendeur Verifie" avec icone ShieldCheck
- Sinon, afficher un formulaire :
  - Select pour le type de document (KTP / Passeport)
  - Upload du document (image, max 5MB)
  - Upload du selfie avec document visible (image, max 5MB)
  - Bouton "Soumettre la verification"
- Les fichiers sont uploades dans le bucket prive `id-verifications` sous le chemin `{user_id}/document.ext` et `{user_id}/selfie.ext`
- Une ligne est inseree dans la table `id_verifications` avec status `pending`
- Si une demande est deja en attente (`pending`), afficher le statut "En cours de verification"
- Si rejetee, permettre de re-soumettre

## 2. Traductions manquantes

Ajouter les cles `security.*` et `profile.*` (identite, verification) dans les 6 fichiers de traduction restants :
- `de.json`, `es.json`, `id.json`, `nl.json`, `ru.json`, `zh.json`

Cles a ajouter (reprises de en.json/fr.json) :
- Toutes les cles du namespace `security` (verifyWhatsapp, sendCode, etc.)
- Les nouvelles cles profil (userTypeNotEditable, whatsappRequired, etc.)
- Nouvelles cles pour la verification identite (becomeVerified, documentType, submitVerification, verificationPending, verificationRejected, verifiedSeller)

## 3. Fix warning console (ref sur Dialog)

Le warning "Function components cannot be given refs" vient du composant `DialogTrigger` dans la section suppression de compte. Corriger en s'assurant que le `Button` enfant utilise bien `asChild` (deja present) -- verifier que le probleme ne vient pas d'un autre endroit.

---

## Details techniques

### Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/pages/Profile.tsx` | Nouveau composant `IdVerification` avec upload document + selfie, query status verification |
| `src/i18n/translations/de.json` | Ajout cles security + profile verification |
| `src/i18n/translations/es.json` | Ajout cles security + profile verification |
| `src/i18n/translations/id.json` | Ajout cles security + profile verification |
| `src/i18n/translations/nl.json` | Ajout cles security + profile verification |
| `src/i18n/translations/ru.json` | Ajout cles security + profile verification |
| `src/i18n/translations/zh.json` | Ajout cles security + profile verification |

### Logique IdVerification

1. Au montage, query `id_verifications` filtree par `user_id` et ordonnee par `created_at desc`, limit 1
2. Selon le statut :
   - `approved` ou `profile.is_verified_seller` : badge vert "Vendeur Verifie"
   - `pending` : message "Verification en cours" avec icone horloge
   - `rejected` ou aucune soumission : formulaire d'upload
3. Upload vers le bucket `id-verifications` (prive, deja cree)
4. Insert dans `id_verifications` avec les chemins storage

### Aucune migration SQL necessaire

Toutes les tables, buckets et policies sont deja en place.

