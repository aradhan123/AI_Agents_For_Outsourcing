from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.core.config import settings


def create_app() -> FastAPI:
    api = FastAPI(title="AI Agents API")

    api.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin] if settings.frontend_origin else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api.include_router(auth_router)
    return api


app = create_app()
