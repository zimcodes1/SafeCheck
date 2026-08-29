from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application configurations"""
    backend_port: int = 8000
    plant_host: str = "127.0.0.1"
    plant_port: int = 5020
    db_path: str = "safecheck.db"
    poll_interval_seconds: float = 1