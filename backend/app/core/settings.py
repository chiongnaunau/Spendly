from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_api_key: str = ""
    dev_user_id: str = "local-user"
    database_url: str = "sqlite+aiosqlite:///./expenses.db"
    cors_origins: str = "http://localhost:3000"
    # AI capabilities
    gemini_api_key: str = ""
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "transactions"
    # Auth & Security
    jwt_secret_key: str = "spendly-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    google_client_id: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
