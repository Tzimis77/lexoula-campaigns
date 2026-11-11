# routes/lexoula.py

from fastapi import APIRouter, Request
from pathlib import Path
import json, datetime

router = APIRouter(prefix="/lexoula", tags=["lexoula"])

DATA_DIR = Path("data/lexoula")
DATA_DIR.mkdir(parents=True, exist_ok=True)

def append_json(filename: str, record: dict):
    path = DATA_DIR / filename
    data = json.loads(path.read_text()) if path.exists() else []
    data.append(record)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))

@router.post("/api/save-win")
async def save_win(request: Request):
    body = await request.json()
    append_json("wins.json", {**body, "receivedAt": datetime.datetime.utcnow().isoformat()})
    return {"ok": True}

@router.post("/api/save-ad-click")
async def save_ad_click(request: Request):
    body = await request.json()
    append_json("ad-clicks.json", {**body, "receivedAt": datetime.datetime.utcnow().isoformat()})
    return {"ok": True}

@router.get("/api/stats")
async def get_stats():
    wins_path = DATA_DIR / "wins.json"
    clicks_path = DATA_DIR / "ad-clicks.json"
    wins = json.loads(wins_path.read_text()) if wins_path.exists() else []
    clicks = json.loads(clicks_path.read_text()) if clicks_path.exists() else []
    return {"wins": wins, "clicks": clicks}

@router.post("/api/log-unknown-word")
async def log_unknown_word(request: Request):
    body = await request.json()
    word = str(body.get("word", "")).strip().upper()
    if len(word) == 5 and word.isalpha():
        append_json("unknown-words.json", {
            **body,
            "word": word,
            "receivedAt": datetime.datetime.now(datetime.UTC).isoformat()
        })
    return {"ok": True}
# Στο lexoula.py — προσθήκη headers
from fastapi import Response
from fastapi.responses import HTMLResponse

@router.get("/", response_class=HTMLResponse)
async def serve_index():
    html = Path("index.html").read_text(encoding="utf-8")
    return Response(
        content=html,
        media_type="text/html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )

