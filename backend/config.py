import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
VIDEOS_DIR = UPLOADS_DIR / "videos"
COVERS_DIR = UPLOADS_DIR / "covers"
DATA_DIR = BASE_DIR / "backend" / "data"

for d in [UPLOADS_DIR, VIDEOS_DIR, COVERS_DIR, DATA_DIR]:
    os.makedirs(d, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/reelposter.db")
SECRET_KEY = os.getenv("SECRET_KEY", "ig_reel_poster_super_secret_key_2026_change_me")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "gAAAAABl_secret_fernet_key_placeholder_32bytes_base64=")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
