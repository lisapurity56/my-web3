from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routers import inquiries


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, debug=settings.app_debug, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Accept", "Content-Type"],
)

app.include_router(inquiries.router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request, error: RequestValidationError):
    messages = []
    for item in error.errors():
        field = ".".join(str(part) for part in item["loc"] if part != "body")
        message = item["msg"].removeprefix("Value error, ")
        messages.append(f"{field}: {message}" if field else message)
    return JSONResponse(status_code=422, content={"error": "; ".join(messages)})


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
