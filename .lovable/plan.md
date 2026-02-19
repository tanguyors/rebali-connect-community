
# Panel Admin Complet

## Vue d'ensemble

Transformer le panel admin actuel (qui ne gere que les signalements) en un tableau de bord complet avec 4 onglets :

1. **Statistiques** -- Vue d'ensemble du site
2. **Signalements** -- Gestion existante (deja en place)
3. **Utilisateurs** -- Liste, recherche, ban/deban
4. **Annonces** -- Liste, recherche, archiver/supprimer

---

## Fonctionnalites par onglet

### Onglet Statistiques
- Nombre total d'utilisateurs inscrits
- Nombre d'annonces actives / archivees / total
- Nombre de signalements ouverts / resolus
- Utilisateurs bannis

### Onglet Signalements (existant)
- Conservation du systeme actuel : signalements en attente / resolus
- Actions : resoudre, archiver l'annonce, bannir le vendeur

### Onglet Utilisateurs
- Tableau avec : nom, email (depuis auth si dispo via profil), date d'inscription, statut (banni ou non), type (private/business)
- Recherche par nom
- Actions : bannir / debannir un utilisateur
- Voir les annonces d'un utilisateur

### Onglet Annonces
- Tableau avec : titre, vendeur, categorie, prix, statut, date de creation
- Recherche par titre
- Filtrage par statut (active, sold, archived)
- Actions : archiver / supprimer une annonce

---

## Plan technique

### 1. Modifier la page Admin (`src/pages/Admin.tsx`)
- Restructurer avec 4 onglets au lieu de 2 (pending/resolved)
- Nouvel onglet "Statistiques" comme page d'accueil
- Nouvel onglet "Utilisateurs" avec requete sur `profiles`
- Nouvel onglet "Annonces" avec requete sur `listings`
- Conserver l'onglet "Signalements" existant

### 2. Requetes Supabase supplementaires
- `profiles` : SELECT tous les profils (deja autorise par RLS "Public profiles are viewable by everyone")
- `listings` : SELECT toutes les annonces (deja autorise par RLS pour les admins via `has_role`)
- Compteurs via des requetes COUNT

### 3. RLS -- Pas de changement necessaire
- Les profils sont deja lisibles publiquement
- Les annonces sont deja visibles par les admins (policy existante)
- La mise a jour des profils (`is_banned`) necessite une policy admin UPDATE -- a verifier

### 4. Migration SQL potentielle
- Ajouter une policy RLS sur `profiles` pour permettre aux admins de mettre a jour `is_banned` :
```sql
CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
```
Note : la policy actuelle ne permet qu'a un utilisateur de modifier son propre profil. L'admin doit pouvoir bannir les autres.

### 5. Traductions
- Ajouter les cles manquantes dans les 8 fichiers de traduction (fr, en, de, es, id, nl, ru, zh) pour les nouveaux labels : statistiques, recherche, filtres, actions, colonnes du tableau

### 6. Aucune nouvelle dependance requise
- Utilisation des composants existants : Table, Tabs, Card, Badge, Button, Input
