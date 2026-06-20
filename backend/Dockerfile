# ---- Build stage: install dependencies with uv ----
FROM python:3.14-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first for better layer caching
COPY pyproject.toml uv.lock .python-version ./

# Install dependencies into a virtual env (no dev deps)
RUN uv sync --frozen --no-install-project --no-dev

# Copy application code
COPY main.py ./
COPY app/ ./app/

# ---- Runtime stage: slim production image ----
FROM python:3.14-slim

WORKDIR /app

# Copy the virtual env and app code from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/main.py /app/main.py
COPY --from=builder /app/app /app/app

# Put the venv on PATH so `python` resolves to the venv's python
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
