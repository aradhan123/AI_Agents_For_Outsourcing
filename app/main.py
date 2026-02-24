from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.core.config import settings
from app.web.routes import router as web_router


def create_app() -> FastAPI:
    api = FastAPI(title="AI Agents API")

    api.add_middleware(
        SessionMiddleware,
        secret_key=settings.jwt_secret,
        same_site=settings.cookie_samesite,
        https_only=settings.cookie_secure,
    )

    api.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin] if settings.frontend_origin else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api.mount("/static", StaticFiles(directory="app/static"), name="static")
    api.include_router(web_router)
    api.include_router(auth_router)
    return api


app = create_app()
