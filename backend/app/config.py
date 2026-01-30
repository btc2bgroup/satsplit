from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/satsplit"
    cors_origins: list[str] = ["http://localhost:3000"]
    exchange_rate_cache_ttl: int = 60
    coingecko_base_url: str = "https://api.coingecko.com/api/v3"
    rate_limit: str = "60/minute"

    model_config = {"env_prefix": "GD_"}


settings = Settings()
