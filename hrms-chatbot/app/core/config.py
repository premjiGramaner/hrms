from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "HRMS Chatbot"
    app_version: str = "1.0.0"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    hrms_api_base_url: str = "http://localhost:5001"
    hrms_api_timeout: int = 10  

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"

    intent_confidence_threshold: float = 0.50
    sklearn_model_path: str = "models/intent_sklearn.pkl"

    redis_url: str = ""
    session_ttl_seconds: int = 1800

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
