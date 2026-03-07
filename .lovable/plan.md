

## Analyse du probleme

Actuellement, le systeme de parrainage fonctionne de deux facons :
1. **Lien web** : `https://re-bali.com/auth?tab=signup&ref=CODE` -- fonctionne bien sur le web, le code est pre-rempli automatiquement
2. **Code manuel** : champ "Code d'invitation" visible sur la page d'inscription

**Le probleme** : quand quelqu'un telecharge l'app native depuis l'App Store / Play Store, il n'y a aucun moyen de transmettre le parametre `?ref=CODE` a l'app. Le lien partage ouvre le navigateur web, pas l'app native.

## Solutions

Il y a deux aspects a traiter :

### 1. Le champ code est deja present
Le champ de saisie du code de parrainage existe deja sur la page Auth.tsx (lignes 253-262). Les utilisateurs natifs **peuvent** deja entrer un code manuellement. Cependant, il est peu visible -- place en bas du formulaire sans mise en valeur.

### 2. Ameliorations proposees

**A. Rendre le champ code plus visible et attractif**
- Ajouter une icone Gift et un style colore au champ referral code sur le formulaire d'inscription
- Ajouter un texte explicatif "Un ami vous a invite ? Entrez son code pour gagner des bonus"
- Deplacer le champ juste apres le nom d'affichage (plus haut dans le formulaire)

**B. Deep linking pour les apps natives (Capacitor)**
- Configurer les Universal Links (iOS) et App Links (Android) pour que `re-bali.com/auth?tab=signup&ref=CODE` ouvre directement l'app native si elle est installee
- Cela necessite une configuration cote serveur (fichier `.well-known/apple-app-site-association` et `assetlinks.json`) et dans les fichiers natifs iOS/Android -- **ceci ne peut pas etre fait depuis Lovable**, il faut le configurer manuellement dans Xcode/Android Studio

**C. Alternative pragmatique : stockage du code en clipboard**
- Le message de partage (deja genere dans `shareReferralLink`) contient le code en clair
- L'utilisateur qui recoit le message peut simplement copier le code et le coller dans le champ a l'inscription
- On peut ajouter un bouton "Coller" a cote du champ referral code pour faciliter la saisie

### Plan d'implementation

1. **Remonter et embellir le champ code de parrainage** dans le formulaire d'inscription (Auth.tsx) -- icone, bordure coloree, texte explicatif
2. **Ajouter un bouton "Coller"** a cote du champ pour coller depuis le clipboard
3. **Ameliorer le message de partage** pour insister sur le code en plus du lien (pour les utilisateurs natifs)
4. **Ajouter les traductions** du nouveau texte explicatif dans les 12 langues

### Details techniques

- **Auth.tsx** : Reorganiser le formulaire, deplacer le bloc referral code plus haut, ajouter `ClipboardPaste` button avec `navigator.clipboard.readText()`
- **Traductions** : Ajouter `referral.invitedByFriend` ("Invited by a friend? Enter their code!") dans les 12 fichiers i18n
- **PointsShop.tsx** : Le message de partage mentionne deja le code + le lien, aucun changement necessaire

Pas de changement de base de donnees ni d'edge function requis.

