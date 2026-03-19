"""
FastAPI WebSocket bridge — receives sensor data from receiver.py via POST
and broadcasts it to all connected browser clients over WebSocket.

USAGE:
    pip install -r requirements.txt
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload

ENDPOINTS:
    POST /sensor       — receiver.py pushes JSON sensor packets here
    WS   /ws           — browser clients connect here for live streaming
    GET  /health       — simple health check
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ── Data model ────────────────────────────────────────────────────────────────

class SensorPacket(BaseModel):
    roll: float
    pitch: float
    yaw: float
    accel_mag: float
    thumb: float = 0.0
    index: float = 0.0
    middle: float = 0.0
    ring: float = 0.0
    pinky: float = 0.0


# ── Connected WebSocket clients ───────────────────────────────────────────────

_clients: set[WebSocket] = set()
_latest: dict | None = None


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Clean up websocket connections on shutdown
    for ws in list(_clients):
        await ws.close()
    _clients.clear()


app = FastAPI(title="HandMusic Sensor Bridge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "clients": len(_clients)}


@app.post("/sensor")
async def ingest_sensor(packet: SensorPacket):
    """Called by receiver.py for every throttled BLE packet."""
    global _latest
    payload = packet.model_dump()
    _latest = payload

    # Broadcast to every connected browser
    dead: list[WebSocket] = []
    for ws in _clients:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _clients.discard(ws)

    return {"ok": True}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _clients.add(ws)

    # Send the most recent reading immediately so the UI doesn't start blank
    if _latest is not None:
        await ws.send_json(_latest)

    try:
        # Keep the connection alive; ignore any messages from the client
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
