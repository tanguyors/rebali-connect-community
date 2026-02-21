

# Badge "Vendeur Verifie" + Ameliorations UX

## Contexte

La verification d'identite est implementee cote profil et admin, mais le badge "Vendeur Verifie" n'apparait nulle part dans l'experience acheteur. Un vendeur verifie n'a aucune distinction visuelle sur ses annonces ou son profil public.

## Modifications prevues

### 1. Badge "Vendeur Verifie" sur ListingCard

Le composant `ListingCard` charge deja le profil vendeur mais ne recupere que `user_type`. Ajouter `is_verified_seller` a la requete et afficher un badge ShieldCheck vert a cote du badge Pro/Private quand le vendeur est verifie.

### 2. Badge "Vendeur Verifie" sur ListingDetail

Dans la page de detail d'annonce, afficher le badge verifie :
- Dans la section "Vendu par" (colonne gauche, ligne 352)
- Dans la carte vendeur sidebar (colonne droite, ligne 468)
- La requete existante charge `profiles!seller_id(...)` : ajouter `is_verified_seller` au select

### 3. Badge "Vendeur Verifie" sur SellerProfile

Le profil public du vendeur charge deja toutes les colonnes (`select('*')`). Ajouter un badge ShieldCheck vert a cote du nom si `seller.is_verified_seller === true`.

### 4. Bouton "Modifier" sur MyListings

Actuellement les vendeurs ne peuvent pas modifier leurs annonces apres publication. Ajouter un bouton "Modifier" sur chaque annonce active dans MyListings qui redirige vers `/create?edit={listing_id}`. Adapter le composant CreateListing pour detecter le parametre `edit` et pre-remplir le formulaire avec les donnees existantes.

---

## Details techniques

| Fichier | Modification |
|---|---|
| `src/components/ListingCard.tsx` | Ajouter `is_verified_seller` au select du profil vendeur, afficher badge ShieldCheck |
| `src/pages/ListingDetail.tsx` | Ajouter `is_verified_seller` au select profiles, afficher badge dans les 2 sections vendeur |
| `src/pages/SellerProfile.tsx` | Afficher badge ShieldCheck si `seller.is_verified_seller` |
| `src/pages/MyListings.tsx` | Ajouter bouton "Modifier" avec lien vers `/create?edit={id}` |
| `src/pages/CreateListing.tsx` | Detecter `?edit=id`, charger l'annonce existante, pre-remplir le formulaire, switcher le bouton en "Mettre a jour" |
| `src/i18n/translations/*.json` | Ajouter les cles `listing.edit`, `listing.update`, `myListings.edit` dans les 8 langues |

### Badge verifie (composant reutilise)

Le badge suivra le meme style que dans Profile.tsx :
- Icone `ShieldCheck` verte
- Texte "Verified" ou traduction locale
- Style : `bg-green-500/10 text-green-600 border-green-500/20`

### Logique edition annonce (CreateListing)

1. Lire `searchParams.get('edit')` au montage
2. Si present, charger l'annonce depuis `listings` avec ses images
3. Pre-remplir tous les champs du formulaire
4. Remplacer le bouton "Publier" par "Mettre a jour"
5. Au submit, utiliser `update` au lieu de `insert` sur la table `listings`
6. Conserver les images existantes, permettre d'en ajouter/supprimer

