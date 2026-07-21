# CONTRIBUTING

Here are the project's naming conventions. These are checked and enforced by GitLab rules when you push.

## Commits

* Format: `subject(scope): message`
* `scope` is optional.
* Example: `dataset: fix input dimensions`

## Branches

* Format: `<ticket-number>-<short-description>`
* Branch names must be created from issues. In that case, they already automatically follow the correct format.
* Examples:
  * `1-init-project`
  * `2-setup-contributing-rules`
  * `42-fix-ci-pipeline`

## Développement en local (sans Docker)

Si vous préférez développer et tester directement sur votre machine sans passer par Docker Compose :

### 1. Backend (FastAPI)

Le backend utilise Python et `uv` comme gestionnaire de dépendances.

```bash
cd backend
uv run python main.py
```

Le serveur tourne sur `http://localhost:8000` avec rechargement automatique.

### 2. Frontend (Next.js)

Le frontend utilise Node.js et `pnpm`.

```bash
cd frontend
pnpm install
pnpm dev
```

Le serveur de dev tourne sur `http://localhost:3000`.
