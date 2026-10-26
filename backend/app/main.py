from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.categories import router as categories_router
from app.core.config import settings
from app.api.v1 import users

app = FastAPI(title=settings.APP_NAME)

origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth_router,
    prefix=settings.API_V1_PREFIX,
)
app.include_router(
    tickets_router,
    prefix=settings.API_V1_PREFIX,
)
app.include_router(
    categories_router,
    prefix=settings.API_V1_PREFIX,
)

app.include_router(
    users.router,
    prefix=settings.API_V1_PREFIX,
)


@app.get("/health")
def health():
    return {"status": "ok"}