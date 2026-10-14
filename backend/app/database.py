from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.config import settings

DATABASE_URL = settings.database_url

if DATABASE_URL.startswith("sqlite"):
    if DATABASE_URL in {"sqlite://", "sqlite:///:memory:"}:
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        db_path = DATABASE_URL.split("sqlite:///", 1)[1]
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
        )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from backend.app.models import Inquiry  # noqa: F401

    Base.metadata.create_all(bind=engine)
