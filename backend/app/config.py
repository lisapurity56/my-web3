from dataclasses import dataclass
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_env: str
    app_debug: bool
    database_url: str
    secret_key: str
    cors_origins: tuple[str, ...]
    admin_email: str
    admin_password: str


def get_settings() -> Settings:
    app_env = os.environ.get("APP_ENV", "development").strip().lower()
    database_url = os.environ.get(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'dev.db'}"
    ).strip()
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url.removeprefix("postgres://")

    secret_key = os.environ.get("SECRET_KEY", "").strip()
    if not secret_key:
        if app_env == "production":
            raise RuntimeError("SECRET_KEY must be set in production.")
        secret_key = "local-development-only-change-before-deploy"
    if app_env == "production" and len(secret_key) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters in production.")

    origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").strip()
    cors_origins = tuple(origin.strip() for origin in origins.split(",") if origin.strip())
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if bool(admin_email) != bool(admin_password):
        raise RuntimeError("Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap an admin.")
    if admin_password and len(admin_password) < 12:
        raise RuntimeError("ADMIN_PASSWORD must be at least 12 characters.")

    return Settings(
        app_name=os.environ.get("APP_NAME", "Joliza Backend"),
        app_env=app_env,
        app_debug=os.environ.get("APP_DEBUG", "false" if app_env == "production" else "true").lower()
        == "true",
        database_url=database_url,
        secret_key=secret_key,
        cors_origins=cors_origins,
        admin_email=admin_email,
        admin_password=admin_password,
    )


settings = get_settings()
