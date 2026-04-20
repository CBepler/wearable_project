"""
Hand Music Project — BLE Receiver
Receives complementary filter output + flex sensor data from the XIAO nRF52840 Sense
and forwards each packet to a FastAPI server for the web app.

PACKET FORMAT:
    "ROLL,PITCH,YAW,ACCEL_MAG,R0,...,Rn\n"

    ROLL/PITCH/YAW  — degrees (complementary filter output)
    ACCEL_MAG       — total acceleration magnitude (m/s²)
    R0–Rn           — flex resistance in Ohms, thumb → pinky
                      only as many R fields as NUM_FLEX in the firmware

CONFIGURATION:
    NUM_FLEX    — must match NUM_FLEX in the firmware (currently 2)
    SERVER_URL  — FastAPI bridge endpoint (set by teammate)
    PRINT_INTERVAL — seconds between printed lines (increase to slow output)

REQUIREMENTS:
    pip install -r requirements.txt

USAGE:
    python receiver.py
"""

import asyncio
import time
from bleak import BleakScanner, BleakClient
import httpx

# ── BLE ──────────────────────────────────────────────────────
DEVICE_NAME    = "HandMusic"
NUS_TX_CHAR    = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

# ── Flex sensors ─────────────────────────────────────────────
# Must match NUM_FLEX in the firmware — increase as you install more sensors
NUM_FLEX       = 5

# Pin-to-finger binding — index = pin number (A0=pinky … A4=thumb).
# Change this list to remap fingers; everything else derives from it.
FINGER_ORDER   = ["pinky", "ring", "middle", "index", "thumb"]
FINGER_NAMES   = [f.capitalize() for f in FINGER_ORDER]

# Per-finger raw ADC calibration (12-bit, 0–4095).
# flat_adc — reading when the finger is fully straight (unflexed)
# bent_adc — reading when the finger is fully bent (flexed)
# Values measured with flex_debug.ino; update after re-calibration.
FLEX_CALIBRATION: dict[str, tuple[int, int]] = {
    #           flat   bent
    "pinky":  (  900,    0),
    "ring":   ( 2200, 1400),
    "middle": ( 2200, 1400),
    "index":  ( 2100, 1400),
    "thumb":  ( 1760,  960),
}

# ── Server ───────────────────────────────────────────────────
SERVER_URL     = "http://localhost:8000/sensor"

# ── Display ──────────────────────────────────────────────────
PRINT_INTERVAL = 0.1   # seconds between printed lines

# ── Internal state ────────────────────────────────────────────
_buffer        = ""
_last_print    = 0.0
_http_client: httpx.AsyncClient | None = None


def _normalize_flex(raw_adc: float, finger: str) -> float:
    """Map a raw 12-bit ADC reading to 0.0 (flat) – 1.0 (fully bent)."""
    flat, bent = FLEX_CALIBRATION[finger]
    if flat == bent:
        return 0.0
    norm = (flat - raw_adc) / (flat - bent)
    return max(0.0, min(1.0, norm))


def parse_line(line: str) -> dict | None:
    """Parse a CSV BLE packet into a sensor dict, or None on error."""
    parts = line.split(",")
    expected = 4 + NUM_FLEX
    if len(parts) != expected:
        print(f"Malformed packet (expected {expected} fields, got {len(parts)}): {line}")
        return None

    roll      = float(parts[0])
    pitch     = float(parts[1])
    yaw       = float(parts[2])
    accel_mag = float(parts[3])

    # Parse and normalise however many flex sensors are active
    flex_raw  = [float(parts[4 + i]) for i in range(NUM_FLEX)]

    flex_norm = [_normalize_flex(flex_raw[i], FINGER_ORDER[i]) for i in range(NUM_FLEX)]

    packet = {
        "roll": roll, "pitch": pitch, "yaw": yaw,
        "accel_mag": accel_mag,
    }
    # Always include all 5 finger keys — uninstalled sensors default to 0.0
    for i, name in enumerate(FINGER_ORDER):
        packet[name] = flex_norm[i] if i < NUM_FLEX else 0.0

    return packet


def _print_packet(packet: dict):
    """Pretty-print a parsed sensor packet to the console."""
    base = (
        f"Roll:{packet['roll']:8.2f}°  "
        f"Pitch:{packet['pitch']:8.2f}°  "
        f"Yaw:{packet['yaw']:8.2f}°  "
        f"|Accel|:{packet['accel_mag']:6.2f} m/s²"
    )
    if NUM_FLEX > 0:
        flex_str = "  ".join(
            f"{FINGER_NAMES[i]}:{packet[n]:>5.2f}"
            for i, n in enumerate(FINGER_ORDER)
            if i < NUM_FLEX
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
        # Fire-and-forget: don't await the full response round-trip
        await _http_client.post(SERVER_URL, json=packet)
    except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteError):
        pass  # server not running or slow — silently skip


def on_notification(sender, data: bytearray):
    global _buffer, _last_print

    _buffer += data.decode("utf-8", errors="replace")

    while "\n" in _buffer:
        line, _buffer = _buffer.split("\n", 1)
        line = line.strip()
        if not line:
            continue

        packet = parse_line(line)
        if packet is None:
            continue

        # Always forward every packet to the server — never drop data
        asyncio.get_event_loop().create_task(_send_to_server(packet))

        # Throttle only the console print (cosmetic, not in the data path)
        now = time.time()
        if now - _last_print >= PRINT_INTERVAL:
            _last_print = now
            _print_packet(packet)


async def run():
    global _http_client
    _http_client = httpx.AsyncClient(timeout=0.5)

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
