# Frontend

## Explications rapide du projet

Nous utilisons Next.js, un framework React qui facilite le développement d'applications web.

Pour les styles, nous utilisons Tailwind CSS, un framework de CSS utilitaire qui permet de créer des designs rapidement et facilement.

Evidemment, tout est fait en typescript, pour plus de sécurité et de maintenabilité !

Le dossier `components` contient tous les composants réutilisables de l'application, comme les boutons, les cartes, etc.
Pour éviter d'y passer des heures, j'ai utilisé une librairie de composants UI appelée [radix-ui](https://www.radix-ui.com/), qui permet super facilement de faire des composants réutilisables, ce qui fait que le code dans `components/ui` est donc auto-généré par radix-ui !

Ce projet utilise `node.js`.

Pour le lancer, il est possible d'utiliser `npm`, mais je recommande `pnpm`, car il est plus rapide !
De manière générale, les commandes sont les mêmes, il suffit de remplacer `pnpm` par `npm run` (ex: `pnpm dev` devient `npm run dev`).

## 1. Installer Node.js

Node.js s'installe depuis <https://nodejs.org>.

`npm` est inclus automatiquement avec Node.js.

## 2. Installer `pnpm`

```bash
npm install -g pnpm # fais le ou je te retrouve et je te tue
```

## 3. Installer les dépendances

Dans le dossier `frontend` :

```bash
pnpm install # ou pnpm i si tu veux économiser 6 caractères
# avec npm : npm install
```

On a aussi besoin de build sharp pour faire fonctionner Next.js :

```bash
pnpm approve-builds sharp # ou npm run approve-builds sharp
```

## 4. Configurer les variables d'environnement

Par défaut, le projet se connecte à un backend qui tourne en local sur le port 8000 (`http://localhost:8000`).
Si tu veux changer ça, tu peux créer un fichier `.env` à la racine du projet et y ajouter la variable d'environnement `NEXT_PUBLIC_BACKEND_URL` :

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## 5. Lancer le projet

Pour démarrer le serveur de développement :

```bash
pnpm dev
# avec npm : npm run dev
```

Le projet sera disponible en local sur `http://localhost:3000`.
Au besoin je crois qu'il est possible de changer le port via une variable d'environnement :

```bash
PORT=4000 pnpm dev # pour lancer sur le port 4000
# avec npm : PORT=4000 npm run dev
```

## 6. Qualité du Code & CI

Avant de créer votre Merge Request, assurez-vous que votre code passe les vérifications de la CI :

**1. Formater le code (Prettier & ESLint) :**

```bash
pnpm exec prettier --write .
pnpm exec eslint . --fix
```

**2. Vérifier les types (TypeScript) :**

```bash
pnpm exec tsc --noEmit
```

## 7. Commandes utiles

Normalement, pas besoin de le faire, mais au cas où :

```bash
pnpm build # pour builder le projet
pnpm start # pour lancer le projet en mode production (je crois que j'ai jamais utilisé cette commande)

# avec npm :
npm run build
npm start
npm run lint
```
