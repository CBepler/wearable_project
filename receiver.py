"""
Hand Music Project — BLE Receiver
Connects to "HandMusic" and prints incoming integers.

REQUIREMENTS:
    pip install bleak

USAGE:
    python receiver.py
"""

import asyncio
from bleak import BleakScanner, BleakClient
import time

last_print = 0
PRINT_INTERVAL = 1.0

DEVICE_NAME  = "HandMusic"
NUS_TX_CHAR  = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  # board → laptop

_buffer = ""

def on_notification(sender, data: bytearray):
    global _buffer, last_print
    _buffer += data.decode("utf-8", errors="replace")
    while "\n" in _buffer:
        line, _buffer = _buffer.split("\n", 1)
        line = line.strip()
        if line:
            now = time.time()
            if now - last_print >= PRINT_INTERVAL:
                last_print = now
                print(f"Received: {line}")

async def run():
    print(f'Scanning for "{DEVICE_NAME}"...')
    device = await BleakScanner.find_device_by_name(DEVICE_NAME, timeout=15.0)
    if not device:
        print("Device not found. Is the board powered on and advertising?")
        return

    print(f"Found {device.name} [{device.address}] — connecting...")
    async with BleakClient(device.address) as client:
        print("Connected! Waiting for data...\n")
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
