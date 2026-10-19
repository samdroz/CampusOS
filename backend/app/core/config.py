import os
import sys
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

def get_app_data_dir() -> Path:
    """Returns the OS-appropriate per-user application data directory for CampusOS."""
    custom_dir = os.environ.get("CAMPUSOS_DATA_DIR")
    if custom_dir:
        path = Path(custom_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    if sys.platform == "win32":
        app_data = os.environ.get("APPDATA")
        if app_data:
            path = Path(app_data) / "CampusOS"
        else:
            path = Path.home() / "AppData" / "Roaming" / "CampusOS"
    elif sys.platform == "darwin":
        path = Path.home() / "Library" / "Application Support" / "CampusOS"
    else:
        xdg_data = os.environ.get("XDG_DATA_HOME")
        if xdg_data:
            path = Path(xdg_data) / "campusos"
        else:
            path = Path.home() / ".local" / "share" / "campusos"

    path.mkdir(parents=True, exist_ok=True)
    return path

def get_default_database_url() -> str:
    """
    Returns the SQLite database URL.
    In desktop/production mode (frozen or CAMPUSOS_DESKTOP=1), uses the per-user AppData directory.
    In local dev mode, uses ./campusos.db.
    """
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]

    is_frozen = getattr(sys, "frozen", False)
    is_desktop = is_frozen or os.environ.get("CAMPUSOS_DESKTOP") == "1"

    if is_desktop:
        data_dir = get_app_data_dir()
        db_path = data_dir / "campusos.db"
        return f"sqlite:///{db_path.as_posix()}"

    return "sqlite:///./campusos.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusOS"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = get_default_database_url()
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "tauri://localhost",
        "http://tauri.localhost",
    ]
    DEFAULT_ATTENDANCE_THRESHOLD: float = 75.0
    DOCS_ENABLED: bool = not (getattr(sys, "frozen", False) or os.environ.get("CAMPUSOS_DESKTOP") == "1")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
