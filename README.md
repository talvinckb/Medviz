# MedViz SAE Project

MedViz est une application de visualisation et d'analyse de données médicales (DICOM vers 3D, prédiction FVC, etc.). Elle se compose d'un backend en Python (FastAPI) et d'un frontend web (Next.js).

## Démarrage rapide avec Docker (Recommandé)

Le projet est entièrement "dockerisé" pour faciliter son déploiement et garantir que l'environnement d'exécution soit identique pour tous.

### Prérequis

- [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/install/) installés sur votre machine.

### Lancer l'application

Pour démarrer l'application (backend + frontend) en arrière-plan, exécutez la commande suivante à la racine du projet :

```bash
docker compose up --build -d
```

Une fois les conteneurs démarrés :

- Le **Frontend** sera accessible sur : [http://localhost:3000](http://localhost:3000)
- Le **Backend (API)** sera accessible sur : [http://localhost:8000](http://localhost:8000)
- La documentation interactive de l'API (Swagger UI) : [http://localhost:8000/docs](http://localhost:8000/docs)

### Arrêter l'application

Pour stopper les conteneurs de l'application, exécutez :

```bash
docker compose down
```

**Note sur la persistance des données** :
L'application utilise un volume Docker nommé (`medviz_data`) pour stocker la base de données SQLite et les données des patients. Ainsi, vos données sont conservées de manière sécurisée même après un `docker compose down`, et n'interfèrent pas avec vos tests en local.

---

## Développement en local (Sans Docker)

Si vous souhaitez travailler sur le code et tester vos modifications sans Docker, l'environnement local et l'environnement Docker sont complètement séparés.

### 1. Backend (FastAPI)

Le backend utilise Python et `uv` comme gestionnaire de dépendances.

```bash
cd backend
# Exécution du serveur de développement (gère l'installation des dépendances)
uv run python main.py
```

Le backend tourne sur `http://localhost:8000` avec rechargement automatique à chaque modification de code.
_Note : La base de données de test locale (`medviz.db`) sera créée directement dans le dossier `backend/`._

### 2. Frontend (Next.js)

Le frontend utilise Node.js et `pnpm`.

```bash
cd frontend
# Installation des dépendances
pnpm install
# Lancement du serveur de développement
pnpm dev
```

Le frontend tourne sur `http://localhost:3000`.
