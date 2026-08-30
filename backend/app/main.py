from fastapi import FastAPI
import asyncio
import logging

from app.database import init_db
from app.routes.plant import router as PlantRouter
from app.routes.commands import router as CommandRouter
from app.routes.history import router as HistoryRouter
from app.services.poller import poll_once
from app.config import Settings

logger = logging.getLogger(__name__)
settings = Settings()

app = FastAPI()
app.router.include_router(PlantRouter, prefix='/api')
app.router.include_router(CommandRouter, prefix="/api")
app.router.include_router(HistoryRouter, prefix="/api")


async def _poll_loop():
    """Background poll loop: runs forever and sleeps asynchronously between polls."""
    while True:
        try:
            await poll_once()
        except Exception:
            logger.exception("Unhandled exception in poll loop")
        await asyncio.sleep(settings.poll_interval_seconds)


# Create database and tables on startup if not already exists
@app.on_event("startup")
async def on_startup():
    init_db()
    # schedule the poller as a background task so startup completes promptly
    asyncio.create_task(_poll_loop())

@app.get("/")
def index():
    return {"message":"Hello World!"}
