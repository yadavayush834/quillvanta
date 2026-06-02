from pathlib import Path
import os

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

DATA_DIR = BACKEND_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
CHROMA_DIR = DATA_DIR / "chroma"
CHAT_HISTORY_DIR = DATA_DIR / "chat_history"
EMBEDDING_CACHE_DIR = DATA_DIR / "cache" / "onnx_models" / "all-MiniLM-L6-v2"
for directory in (DATA_DIR, UPLOAD_DIR, CHROMA_DIR, CHAT_HISTORY_DIR, EMBEDDING_CACHE_DIR):
    directory.mkdir(parents=True, exist_ok=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "20")) * 1024 * 1024
