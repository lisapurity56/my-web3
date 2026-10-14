from dataclasses import dataclass
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_debug: bool
    database_url: str


def get_settings() -> Settings:
    database_url = os.environ.get(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'dev.db'}"
    ).strip()
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url.removeprefix("postgres://")

    debug_default = os.environ.get("APP_ENV", "development").lower() != "production"

    return Settings(
        app_name=os.environ.get("APP_NAME", "Joliza Backend"),
        app_debug=os.environ.get("APP_DEBUG", str(debug_default)).lower() == "true",
        database_url=database_url,
    )


settings = get_settings()
