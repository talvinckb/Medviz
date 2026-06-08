from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.database import init_db
from app.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # TODO: load ml model
    yield


app = FastAPI(
    title="MedViz API",
    description="API du Backend de notre super projet medviz",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:3000",  # Frontend URL , local host
    "*",  # Allows all origins (not recommended for production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # allow methods
    allow_headers=["*"],  # allow headers
)

app.include_router(router)


@app.get("/")
def read_root():
    return {
        "message": "Bienvenue sur le Backend de notre super projet medviz",
        "doc": "http://127.0.0.1:8000/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
