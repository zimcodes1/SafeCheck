from fastapi import FastAPI
import asyncio
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes.plant import router as PlantRouter
from app.routes.commands import router as CommandRouter
from app.routes.history import router as HistoryRouter
from app.routes.alerts import router as AlertsRouter
from app.routes.simulate import router as SimRouter
from app.logger import setup_logger, RequestLoggingMiddleware
from app.services.poller import poll_once
from app.config import Settings

settings = Settings()

#CORS allowed origins
origins = [
    "http://localhost:5173/"
]

# backend logger (per-session file + console)
logger = setup_logger(name="safecheck.backend")

app = FastAPI()
app.add_middleware(
    CORSMiddleware, 
    allow_origins=origins, 
    allow_methods=["*"],
    allow_credentials=True, 
    allow_headers=["*"]
    )

# attach request logging middleware
app.add_middleware(RequestLoggingMiddleware, logger=logger)
# Mount routers with /api prefix (for frontend/API standard)
app.router.include_router(PlantRouter, prefix='/api')
app.router.include_router(CommandRouter, prefix="/api")
app.router.include_router(HistoryRouter, prefix="/api")
app.router.include_router(AlertsRouter, prefix="/api")
app.router.include_router(SimRouter, prefix="/api")

# Also mount at root for direct roadmap compatibility (e.g. GET /plant/live, GET /alerts)
app.router.include_router(PlantRouter)
app.router.include_router(CommandRouter)
app.router.include_router(HistoryRouter)
app.router.include_router(AlertsRouter)
app.router.include_router(SimRouter)


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
