import os
from pathlib import Path

from dotenv import load_dotenv, set_key

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)


class Settings:
    @property
    def base_url(self) -> str:
        return os.getenv("PINEAPPLE_BASE_URL", "https://172.16.42.1:1471")

    @property
    def username(self) -> str:
        return os.getenv("PINEAPPLE_USERNAME", "root")

    @property
    def password(self) -> str:
        return os.getenv("PINEAPPLE_PASSWORD", "")

    @property
    def verify_ssl(self) -> bool:
        return os.getenv("VERIFY_SSL", "false").strip().lower() == "true"

    @property
    def token(self) -> str | None:
        return os.getenv("TOKEN") or None

    def save_token(self, token: str) -> None:
        os.environ["TOKEN"] = token
        set_key(str(ENV_PATH), "TOKEN", token)


settings = Settings()
