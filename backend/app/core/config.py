from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusOS"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./campusos.db"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]
    DEFAULT_ATTENDANCE_THRESHOLD: float = 75.0

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
