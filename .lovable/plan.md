

## Probleme

Quand l'utilisateur est sur l'app native et clique sur "Boost", l'app ouvre la webapp dans un **in-app browser** (Capacitor Browser). Ensuite, sur la page `/points`, quand il clique "Acheter" pour payer via Xendit, le code appelle `openExternal(invoice_url)` qui tente d'ouvrir un **second** in-app browser — ce qui ne fonctionne pas car on est deja dans un in-app browser.

Le meme probleme se produit sur la page VIP (`/points` et `/vip`).

## Solution

Detecter si la page est actuellement affichee dans un **in-app browser** (et non dans l'app native elle-meme ni dans un navigateur normal). Dans ce cas, au lieu d'appeler `openExternal()`, rediriger directement via `window.location.href` vers l'URL Xendit. Cela permet au navigateur in-app deja ouvert de naviguer vers la page de paiement Xendit sans essayer d'ouvrir une nouvelle fenetre.

### Detection

On peut detecter qu'on est dans un in-app browser de deux manieres :
1. **URL parameter** : Quand `openExternalAuthenticated` construit l'URL, ajouter un parametre `?source=native` pour signaler que la page est ouverte depuis l'app native.
2. **Capacitor check** : `Capacitor.isNativePlatform()` retournera `false` dans l'in-app browser (c'est une page web normale), donc on ne peut pas s'y fier.

L'approche par parametre URL est la plus fiable.

### Fichiers a modifier

1. **`src/lib/openExternal.ts`** — Dans `openExternalAuthenticated`, ajouter `?source=native` a l'URL avant d'ajouter le hash avec les tokens.

2. **`src/pages/PointsShop.tsx`** — Quand `invoice_url` est recu, verifier si `window.location.search` contient `source=native`. Si oui, faire `window.location.href = invoice_url` au lieu de `openExternal(invoice_url)`.

3. **`src/pages/VIP.tsx`** — Meme logique : si `source=native`, rediriger directement via `window.location.href`.

4. **Optionnel : helper utilitaire** — Creer une petite fonction `isInAppBrowser()` qui verifie `new URLSearchParams(window.location.search).get('source') === 'native'` pour reutiliser la logique.

### Impact

- Aucun changement cote base de donnees
- Aucun changement sur les edge functions
- Le flux normal sur navigateur web n'est pas affecte (le parametre `source=native` n'est present que quand on vient de l'app native)

