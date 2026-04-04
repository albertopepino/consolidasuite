from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://interfinops:interfinops@localhost:5432/interfinops"

    # JWT / Auth
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Rate limiting
    RATE_LIMIT_DEFAULT: str = "60/minute"

    # Application
    APP_NAME: str = "InterFinOps"
    DEBUG: bool = False

    # Cookie settings
    COOKIE_DOMAIN: str | None = None
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "strict"


settings = Settings()

if not settings.DEBUG and settings.SECRET_KEY == "CHANGE-ME-IN-PRODUCTION":
    raise RuntimeError("FATAL: SECRET_KEY must be changed in production! Set a secure random key via environment variable.")

__all__ = ["settings", "Settings"]
