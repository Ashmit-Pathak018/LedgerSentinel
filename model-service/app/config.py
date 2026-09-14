from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Model toggle ──────────────────────────────────────────────────────────
    MODELS_MOCK: bool = False
    DEMO_CACHE_MODE: bool = False
    DEMO_CACHE_PATH: str = "fixtures/demo_cache.json"

    # ── Ollama ────────────────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # ── Model identifiers ─────────────────────────────────────────────────────
    GEMMA_MODEL: str = "gemma3n:e4b"
    QWEN_MODEL: str = "qwen3:4b-q8_0"

    # ── Version strings ───────────────────────────────────────────────────────
    MODEL_VERSION: str = "gemma3n-e4b-v1.0"
    POLICY_VERSION: str = "v1.0"

    # ── Calibration ───────────────────────────────────────────────────────────
    CALIBRATION_SCALER_PATH: str = "calibration/scaler.pkl"

    # ── Server ────────────────────────────────────────────────────────────────
    PORT: int = 8000   # contracts/ENDPOINTS.md
    LOG_LEVEL: str = "info"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
