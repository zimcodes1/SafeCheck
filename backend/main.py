import uvicorn
from app.config import Settings

settings = Settings()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host='0.0.0.0', port=settings.backend_port, reload=True, log_level="info")

