"""
Hand Music Project — BLE Receiver
Receives complementary filter output + flex sensor data from the XIAO nRF52840 Sense.

PACKET FORMAT:
    "ROLL,PITCH,YAW,ACCEL_MAG,R0,...,Rn\n"

    ROLL/PITCH/YAW  — degrees (complementary filter output)
    ACCEL_MAG       — total acceleration magnitude (m/s²)
    R0–R4           — flex resistance in Ohms, thumb → pinky
                      only as many R fields as NUM_FLEX in the firmware

Set NUM_FLEX below to match the value in the firmware (currently 1).

REQUIREMENTS:
    pip install -r requirements.txt

USAGE:
    python receiver.py
"""

import asyncio
import time
from bleak import BleakScanner, BleakClient
import httpx

DEVICE_NAME    = "HandMusic"
NUS_TX_CHAR    = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

SERVER_URL     = "http://localhost:8000/sensor"   # FastAPI bridge endpoint
# Must match NUM_FLEX in the firmware — increase as you install more sensors
NUM_FLEX       = 1

PRINT_INTERVAL = 0.1   # seconds between printed lines
FINGER_NAMES   = ["Thumb", "Index", "Middle", "Ring", "Pinky"]

_buffer        = ""
_last_print    = 0.0
_http_client: httpx.AsyncClient | None = None

# Normalisation constants for flex sensors (resistance in Ohms)
FLEX_R_FLAT = 10_000    # ~10 kΩ when flat
FLEX_R_BENT = 125_000   # ~125 kΩ when fully bent


def _normalize_flex(resistance: float) -> float:
    """Map raw flex resistance (Ω) to 0.0–1.0 range."""
    clamped = max(FLEX_R_FLAT, min(FLEX_R_BENT, resistance))
    return (clamped - FLEX_R_FLAT) / (FLEX_R_BENT - FLEX_R_FLAT)


def parse_line(line: str) -> dict | None:
    """Parse a CSV BLE line into a sensor dict, or None on error."""
    parts = line.split(",")

    if not FLEX_ENABLED:
        if len(parts) != 4:
            print(f"Malformed packet (expected 4 fields): {line}")
            return None
        roll, pitch, yaw, accel_mag = (float(p) for p in parts)
        return {
            "roll": roll, "pitch": pitch, "yaw": yaw,
            "accel_mag": accel_mag,
            "thumb": 0.0, "index": 0.0, "middle": 0.0,
            "ring": 0.0, "pinky": 0.0,
        }
    else:
        if len(parts) != 9:
            print(f"Malformed packet (expected 9 fields): {line}")
            return None
        roll, pitch, yaw, accel_mag = (float(p) for p in parts[:4])
        flex_raw = [float(p) for p in parts[4:]]
        flex_norm = [_normalize_flex(r) for r in flex_raw]
        names = ["thumb", "index", "middle", "ring", "pinky"]
        packet = {
            "roll": roll, "pitch": pitch, "yaw": yaw,
            "accel_mag": accel_mag,
        }
        for name, val in zip(names, flex_norm):
            packet[name] = val
        return packet


def _print_packet(packet: dict):
    """Pretty-print a parsed sensor packet to the console."""
    roll, pitch, yaw = packet["roll"], packet["pitch"], packet["yaw"]
    accel = packet["accel_mag"]
    base = (
        f"Roll:{roll:8.2f}°  Pitch:{pitch:8.2f}°  Yaw:{yaw:8.2f}°  "
        f"|Accel|:{accel:6.2f} m/s²"
    )
    if FLEX_ENABLED:
        flex_str = "  ".join(
            f"{FINGER_NAMES[i]}:{packet[n]:>5.2f}"
            for i, n in enumerate(["thumb", "index", "middle", "ring", "pinky"])
        )
        print(f"{base}  |  {flex_str}")
    else:
        print(base)


async def _send_to_server(packet: dict):
    """POST the sensor packet to the FastAPI bridge (fire-and-forget)."""
    global _http_client
    if _http_client is None:
        return
    try:
        await _http_client.post(SERVER_URL, json=packet)
    except httpx.ConnectError:
        pass  # server not running — silently skip


def on_notification(sender, data: bytearray):
    global _buffer, _last_print

    _buffer += data.decode("utf-8", errors="replace")

    while "\n" in _buffer:
        line, _buffer = _buffer.split("\n", 1)
        line = line.strip()
        if not line:
            continue

        now = time.time()
        if now - _last_print < PRINT_INTERVAL:
            continue
        _last_print = now

        packet = parse_line(line)
        if packet is None:
            continue

        _print_packet(packet)
        asyncio.get_event_loop().create_task(_send_to_server(packet))


async def run():
    global _http_client
    _http_client = httpx.AsyncClient(timeout=2.0)

    print(f'Scanning for "{DEVICE_NAME}"...')
    device = await BleakScanner.find_device_by_name(DEVICE_NAME, timeout=15.0)
    if not device:
        print("Device not found. Is the board powered on and advertising?")
        await _http_client.aclose()
        return

    print(f"Found {device.name} [{device.address}] — connecting...")
    async with BleakClient(device.address) as client:
        print("Connected! Receiving data...\n")
        await client.start_notify(NUS_TX_CHAR, on_notification)
        try:
            while client.is_connected:
                await asyncio.sleep(0.1)
        except KeyboardInterrupt:
            print("\nStopped.")
        finally:
            if client.is_connected:
                await client.stop_notify(NUS_TX_CHAR)
            await _http_client.aclose()


if __name__ == "__main__":
    asyncio.run(run())
