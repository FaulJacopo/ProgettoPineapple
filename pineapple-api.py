from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.pineapple_client import client
from app.routers import (
    auth,
    campaigns,
    dashboard,
    generic,
    modules,
    notifications,
    pineap,
    recon,
    settings,
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await client.aclose()


app = FastAPI(title="WiFi Pineapple Manager", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(notifications.router)
app.include_router(generic.router)
app.include_router(dashboard.router)
app.include_router(campaigns.router)
app.include_router(pineap.router)
app.include_router(recon.router)
app.include_router(settings.router)
app.include_router(modules.router)

@app.middleware("http")
async def no_cache_static(request, call_next):
    response = await call_next(request)
    if request.url.path == "/" or request.url.path.startswith(("/js/", "/css/")):
        response.headers["Cache-Control"] = "no-cache"
    return response


app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    # Il nome del file contiene un trattino, non importabile come modulo:
    # passiamo l'app direttamente (niente --reload in questo modo).
    uvicorn.run(app, host="0.0.0.0", port=8000)
