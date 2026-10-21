import os
import sys
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

def get_desktop_port() -> Optional[int]:
    """
    Returns the explicitly configured or detected desktop listening port.
    In packaged desktop mode, this is passed via CAMPUSOS_DESKTOP_PORT.
    """
    val = os.environ.get("CAMPUSOS_DESKTOP_PORT")
    if val:
        try:
            return int(val)
        except ValueError:
            pass
    return None

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

def get_app_version() -> str:
    """
    Resolves application version reliably in packaged and dev environments:
    1. Environment override (CAMPUSOS_VERSION / GITHUB_REF_NAME)
    2. Embedded package version (backend.app.version)
    3. Tauri configuration file (if present in local dev)
    4. Fallback '1.0.0'
    """
    raw = os.environ.get("CAMPUSOS_VERSION") or os.environ.get("GITHUB_REF_NAME")
    if raw:
        import re
        m = re.match(r"^v?(\d+\.\d+\.\d+.*)$", raw)
        if m:
            return m.group(1)

    try:
        from backend.app.version import __version__
        if __version__:
            return str(__version__)
    except Exception:
        pass

    try:
        tauri_conf = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "src-tauri" / "tauri.conf.json"
        if tauri_conf.exists():
            import json
            data = json.loads(tauri_conf.read_text(encoding="utf-8"))
            if "version" in data and data["version"]:
                return str(data["version"])
    except Exception:
        pass

    return "1.0.0"

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusOS"
    APP_VERSION: str = get_app_version()
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
    DESKTOP_PORT: Optional[int] = get_desktop_port()

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
