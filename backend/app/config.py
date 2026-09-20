from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configurations"""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    backend_port: int = 8000
    plant_host: str = "127.0.0.1"
    plant_port: int = 5020
    db_path: str = "safecheck.db"
    poll_interval_seconds: float = 1
    # Packet capture is the primary command sensor.  These remain environment
    # configurable because loopback device names differ between platforms.
    sniffer_enabled: bool = True
    sniff_interface: str | None = "lo"

