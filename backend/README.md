# MedViz Backend API

## 1. Prérequis

- Python 3.14
- [uv](https://github.com/astral-sh/uv) (Package Manager)

## 2. Installation & Lancement

```bash
cd backend
uv sync
uv run python src/main.py
```

## 3. Qualité du Code & CI

La pipeline GitLab CI vérifiera automatiquement le formatage et les tests à chaque push.

**1. Formater le code (Ruff) :**

```bash
uv run ruff format .
uv run ruff check . --fix
```

**2. Lancer les tests (Pytest) :**

```bash
uv run pytest --cov=. --tb=short
```
