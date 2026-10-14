from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routers import inquiries

app = FastAPI(title=settings.app_name, debug=settings.app_debug)

app.include_router(inquiries.router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request, error: RequestValidationError):
    messages = []
    for item in error.errors():
        field = ".".join(str(part) for part in item["loc"] if part != "body")
        message = item["msg"].removeprefix("Value error, ")
        messages.append(f"{field}: {message}" if field else message)
    return JSONResponse(status_code=422, content={"error": "; ".join(messages)})


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
