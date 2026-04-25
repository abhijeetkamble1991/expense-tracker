from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./expense_tracker.db"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    bootstrap_username: str = "owner"
    bootstrap_password: str = "secret123"

    model_config = SettingsConfigDict(
        env_prefix="EXPENSE_TRACKER_",
        env_file=".env",
    )


settings = Settings()
