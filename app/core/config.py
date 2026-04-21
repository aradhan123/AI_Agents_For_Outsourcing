from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg2://appuser:apppassword@localhost:5433/appdb"

    jwt_secret: str = "dev-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    frontend_origin: str = "http://localhost:5173"

    cookie_secure: bool = False
    cookie_samesite: str = "lax"  # lax|strict|none
    cookie_domain: str | None = None

    google_client_id: str | None = None
    google_client_secret: str | None = None

    resend_api_key: str | None = None
    email_from_address: str | None = None
    email_from_name: str = "AI Scheduler"
    app_base_url: str = "http://localhost:5173"

    log_level: str = "INFO"


settings = Settings()
