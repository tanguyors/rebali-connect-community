

## Audit de publication Store — Points bloquants potentiels

Voici une analyse complète de ce qui pourrait bloquer ou retarder la publication sur l'App Store (Apple) et le Google Play Store.

---

### 1. Permissions iOS manquantes (BLOQUANT Apple)

Le fichier `Info.plist` ne contient **aucune description d'usage** (Usage Description) pour les permissions utilisées par les plugins Capacitor installés :

- **`@capacitor/camera`** est installé → nécessite `NSCameraUsageDescription` et `NSPhotoLibraryUsageDescription`
- **`@capacitor/push-notifications`** est utilisé → les notifications push fonctionnent mais Apple exige parfois une description claire
- La localisation n'est pas utilisée actuellement, donc OK

**Sans ces clés, Apple rejettera automatiquement le build.** L'app utilise l'upload de photos (CreateListing), donc même si c'est via un `<input type="file">`, le plugin camera est présent et Apple scannera les frameworks liés.

**Action** : Ajouter les `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, et `NSPhotoLibraryAddUsageDescription` dans `Info.plist`.

---

### 2. Permissions Android manquantes (BLOQUANT potentiel)

Le `AndroidManifest.xml` ne déclare que `INTERNET`. Il manque :

- **`CAMERA`** et **`READ_MEDIA_IMAGES`** / **`READ_EXTERNAL_STORAGE`** pour les photos
- **`POST_NOTIFICATIONS`** (Android 13+) pour les push notifications

**Action** : Ajouter les permissions nécessaires dans `AndroidManifest.xml`.

---

### 3. Politique de confidentialité accessible (OK mais à vérifier)

Les deux stores exigent une URL de politique de confidentialité fonctionnelle. La page `/privacy` existe et l'URL `https://re-bali.com/privacy` est référencée dans le guide. C'est OK tant que le domaine est actif.

---

### 4. Achats in-app / Redirection externe (RISQUE modéré)

Nous avons correctement masqué les achats directs sur les apps natives et redirigeons vers le navigateur. **Attention** : Apple est strict sur le fait de même **mentionner** qu'on peut acheter ailleurs. Il faudra vérifier que les textes affichés dans l'app ne disent pas explicitement "achetez sur le web" — la formulation doit rester neutre (type "Gérer votre compte" plutôt que "Acheter des points sur le web").

**Action** : Revoir les traductions `points.buyViaWebapp` dans les 12 fichiers de traduction pour adoucir le wording.

---

### 5. Splash Screen et Icônes (à vérifier manuellement)

Les fichiers splash et icônes existent dans les dossiers Android et iOS, mais il faut s'assurer que ce sont bien les visuels Re-Bali et pas les assets Capacitor par défaut. Apple rejette les apps avec des icônes placeholder.

---

### 6. App Transport Security (iOS) — OK

Le `androidScheme: 'https'` est configuré. L'app communique avec Supabase en HTTPS. Pas de problème ATS.

---

### Résumé des actions techniques à implémenter

| Priorité | Action | Fichier |
|----------|--------|---------|
| CRITIQUE | Ajouter NSCameraUsageDescription + NSPhotoLibraryUsageDescription | `ios/App/App/Info.plist` |
| CRITIQUE | Ajouter permissions CAMERA, storage, POST_NOTIFICATIONS | `android/AndroidManifest.xml` |
| IMPORTANT | Adoucir le wording de redirection achat (éviter "acheter sur le web") | 12 fichiers i18n |
| RECOMMANDÉ | Vérifier que les icônes/splash ne sont pas des placeholders Capacitor | Vérification manuelle |

