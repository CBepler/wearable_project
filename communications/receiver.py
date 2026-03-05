"""
Hand Music Project — BLE Receiver
Receives complementary filter output + flex sensor data from the XIAO nRF52840 Sense.

CURRENT PACKET FORMAT (flex sensors not yet installed):
    "ROLL,PITCH,YAW,ACCEL_MAG\n"

PACKET FORMAT once flex sensors are enabled:
    "ROLL,PITCH,YAW,ACCEL_MAG,R0,R1,R2,R3,R4\n"

    ROLL/PITCH/YAW  — degrees (complementary filter output)
    ACCEL_MAG       — total acceleration magnitude (m/s²)
    R0–R4           — flex resistance in Ohms, thumb → pinky

To enable flex sensor parsing: set FLEX_ENABLED = True below.

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

PRINT_INTERVAL = 0.1    # seconds between printed lines — increase to slow output
FLEX_ENABLED   = False  # set True once flex sensors are wired and firmware updated

_buffer        = ""
_last_print    = 0.0

FINGER_NAMES   = ["Thumb", "Index", "Middle", "Ring", "Pinky"]


def parse_and_print(line: str):
    parts = line.split(",")

    if not FLEX_ENABLED:
        # Expecting: ROLL, PITCH, YAW, ACCEL_MAG
        if len(parts) != 4:
            print(f"Malformed packet (expected 4 fields): {line}")
            return
        roll, pitch, yaw, accel_mag = [float(p) for p in parts]
        print(
            f"Roll:{roll:8.2f}°  Pitch:{pitch:8.2f}°  Yaw:{yaw:8.2f}°  "
            f"|Accel|:{accel_mag:6.2f} m/s²"
        )

    else:
        # Expecting: ROLL, PITCH, YAW, ACCEL_MAG, R0, R1, R2, R3, R4
        if len(parts) != 9:
            print(f"Malformed packet (expected 9 fields): {line}")
            return
        roll, pitch, yaw, accel_mag = [float(p) for p in parts[:4]]
        flex = [float(p) for p in parts[4:]]
        flex_str = "  ".join(
            f"{FINGER_NAMES[i]}:{flex[i]:>7.0f}Ω" for i in range(5)
        )
        print(
            f"Roll:{roll:8.2f}°  Pitch:{pitch:8.2f}°  Yaw:{yaw:8.2f}°  "
            f"|Accel|:{accel_mag:6.2f} m/s²  |  {flex_str}"
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
