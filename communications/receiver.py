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

DEVICE_NAME    = "HandMusic"
NUS_TX_CHAR    = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

# Must match NUM_FLEX in the firmware — increase as you install more sensors
NUM_FLEX       = 1

PRINT_INTERVAL = 0.1   # seconds between printed lines
FINGER_NAMES   = ["Thumb", "Index", "Middle", "Ring", "Pinky"]

_buffer        = ""
_last_print    = 0.0


def parse_and_print(line: str):
    parts = line.split(",")
    expected = 4 + NUM_FLEX
    if len(parts) != expected:
        print(f"Malformed packet (expected {expected} fields, got {len(parts)}): {line}")
        return

    roll      = float(parts[0])
    pitch     = float(parts[1])
    yaw       = float(parts[2])
    accel_mag = float(parts[3])
    flex      = [float(parts[4 + i]) for i in range(NUM_FLEX)]

    flex_str = "  ".join(
        f"{FINGER_NAMES[i]}:{flex[i]:>7.0f}Ω" for i in range(NUM_FLEX)
    )

    print(
        f"Roll:{roll:8.2f}°  Pitch:{pitch:8.2f}°  Yaw:{yaw:8.2f}°  "
        f"|Accel|:{accel_mag:6.2f} m/s²"
        + (f"  |  {flex_str}" if NUM_FLEX > 0 else "")
    )


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

        parse_and_print(line)


async def run():
    print(f'Scanning for "{DEVICE_NAME}"...')
    device = await BleakScanner.find_device_by_name(DEVICE_NAME, timeout=15.0)
    if not device:
        print("Device not found. Is the board powered on and advertising?")
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


if __name__ == "__main__":
    asyncio.run(run())
