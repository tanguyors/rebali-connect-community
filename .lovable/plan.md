

# Page Favoris + Messagerie In-App

## Contexte

Le Header contient des liens vers `/favorites` et `/messages` mais ces pages n'existent pas. Le systeme de favoris est deja fonctionnel en base (table `favorites` avec RLS) mais il manque une page dediee. Pour la messagerie, une table de conversations sera necessaire.

## 1. Page Favoris (`/favorites`)

Creer une page simple qui affiche toutes les annonces que l'utilisateur a mises en favori.

- Query `favorites` filtree par `user_id = auth.uid()`, join sur `listings` avec `listing_images` et `listing_translations`
- Reutiliser le composant `ListingCard` existant pour l'affichage
- Message si aucun favori : "Vous n'avez pas encore de favoris"
- Redirection vers `/auth` si non connecte

## 2. Systeme de messagerie in-app

### Nouvelle table `conversations`

| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| listing_id | uuid FK | Annonce concernee |
| buyer_id | uuid | Acheteur |
| seller_id | uuid | Vendeur |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Nouvelle table `messages`

| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid FK | |
| sender_id | uuid | Auteur du message |
| content | text | Contenu |
| read | boolean | Lu par le destinataire |
| created_at | timestamptz | |

### RLS Policies

- `conversations` : SELECT/INSERT pour les participants (`buyer_id` ou `seller_id = auth.uid()`)
- `messages` : SELECT pour les participants de la conversation, INSERT pour les participants

### Page Messages (`/messages`)

- Liste des conversations avec apercu du dernier message
- Vue conversation avec historique des messages et champ de saisie
- Indicateur de messages non lus
- Bouton "Contacter le vendeur" sur `ListingDetail` ouvre/cree une conversation

## 3. Routes et Navigation

Ajouter les routes `/favorites` et `/messages` dans `App.tsx`.

## 4. Traductions

Ajouter les cles `favorites.*` et `messages.*` dans les 8 fichiers de traduction.

---

## Details techniques

| Fichier | Modification |
|---|---|
| Migration SQL | Creer tables `conversations` et `messages` avec RLS |
| `src/pages/Favorites.tsx` | Nouvelle page favoris |
| `src/pages/Messages.tsx` | Nouvelle page messagerie |
| `src/App.tsx` | Ajouter routes `/favorites` et `/messages` |
| `src/pages/ListingDetail.tsx` | Bouton "Envoyer un message" qui cree/ouvre une conversation |
| `src/i18n/translations/*.json` | Cles favorites + messages dans 8 langues |

### Logique de conversation

1. Sur ListingDetail, bouton "Envoyer un message" verifie si une conversation existe deja entre l'acheteur et le vendeur pour cette annonce
2. Si oui, redirige vers `/messages?conv={conversation_id}`
3. Si non, cree la conversation puis redirige
4. Page Messages : liste des conversations a gauche, messages a droite (ou vue mobile empilee)
5. Realtime optionnel via `supabase.channel` pour les nouveaux messages

