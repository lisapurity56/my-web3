from dataclasses import dataclass
import os
from pathlib import Path
import re

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(path: Path = BASE_DIR / ".env") -> None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return

    for line_number, line in enumerate(lines, start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            raise ValueError(f"Invalid environment variable in {path}:{line_number}.")

        value = value.strip()
        if value.startswith(("'", '"')):
            match = re.fullmatch(r"""(['"])(.*?)\1(?:\s+#.*)?""", value)
            if not match:
                raise ValueError(f"Unclosed quoted value in {path}:{line_number}.")
            value = match.group(2)
        else:
            value = re.split(r"\s+#", value, maxsplit=1)[0].rstrip()
        os.environ.setdefault(key, value)


load_env_file()


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
