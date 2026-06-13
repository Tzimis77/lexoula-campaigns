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
