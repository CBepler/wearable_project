# Hand Music — XIAO nRF52840 Sense

A gesture-based musical instrument that streams gyroscope, accelerometer, and flex sensor data over BLE to a laptop for sound synthesis.

---

## Repository Structure

```
hand-music/
├── xiao_gyro_ble/
│   └── xiao_gyro_ble.ino   # Arduino firmware for the XIAO board
├── receiver.py              # Python BLE receiver (run on laptop)
├── requirements.txt         # Python dependencies
└── README.md
```

---

## Hardware

- **Board:** Seeed Studio XIAO nRF52840 Sense
- **Flex sensors:** 5× (one per finger)
- **Resistors:** 5× 10kΩ (voltage divider for each flex sensor)

### Flex Sensor Wiring

Wire one voltage divider per finger. All five are identical:

```
3.3V ──── [Flex Sensor] ──── signal ──── [10kΩ] ──── GND
                                  ↑
                             ADC pin
```

| Finger | ADC Pin |
|--------|---------|
| Thumb  | A0      |
| Index  | A1      |
| Middle | A2      |
| Ring   | A3      |
| Pinky  | A4      |

---

## Firmware Setup (Arduino)

### 1. Install Arduino IDE
Download from [arduino.cc](https://www.arduino.cc/en/software) (version 1.8.15 or later).

### 2. Add the Seeed board package
Open **File → Preferences** and add this URL to *Additional Board Manager URLs*:
```
https://files.seeedstudio.com/arduino/package_seeeduino_boards_index.json
```
Then open **Tools → Board → Board Manager**, search `seeed nrf52`, and install **Seeed nRF52 mbed-enabled Boards**.

> ⚠️ You must install the **mbed-enabled** package, not plain "Seeed nRF52 Boards". The non-mbed package cannot reliably access the IMU.

### 3. Select the board
**Tools → Board → Seeed nRF52 mbed-enabled Boards → Seeed XIAO BLE Sense - nRF52840**

### 4. Install Arduino libraries

**ArduinoBLE** — install via Library Manager (**Sketch → Include Library → Manage Libraries**, search `ArduinoBLE`).

**Seeed Arduino LSM6DS3** — must be installed manually as a ZIP:
1. Download from [github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3](https://github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3) → Code → Download ZIP
2. In Arduino IDE: **Sketch → Include Library → Add .ZIP Library...** → select the downloaded file

### 5. Upload the firmware
1. Connect the XIAO via USB-C
2. Select the correct port under **Tools → Port**
3. Open `xiao_gyro_ble/xiao_gyro_ble.ino` and click **Upload**
4. Once uploaded, the red LED will blink — the board is advertising and waiting for a connection

---

## Python Receiver Setup

### 1. Python version
Python 3.8 or later is required. Check with:
```bash
python --version
```

### 2. Create a virtual environment (recommended)
```bash
python -m venv venv
```
Activate it:
```bash
# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the receiver
```bash
python receiver.py
```

The script will scan for a BLE device named `HandMusic`, connect automatically, and begin printing incoming data. When connected, the board's green LED turns solid.

### 5. Stop
Press `Ctrl+C` to disconnect.

---

## Data Format

Each packet is a newline-terminated CSV string sent at **50 Hz**:

```
GX,GY,GZ,AX,AY,AZ,R0,R1,R2,R3,R4\n
```

| Field    | Description                        | Unit   |
|----------|------------------------------------|--------|
| GX/GY/GZ | Gyroscope (X, Y, Z)               | deg/s  |
| AX/AY/AZ | Accelerometer (X, Y, Z)           | m/s²   |
| R0       | Flex sensor resistance — Thumb     | Ω      |
| R1       | Flex sensor resistance — Index     | Ω      |
| R2       | Flex sensor resistance — Middle    | Ω      |
| R3       | Flex sensor resistance — Ring      | Ω      |
| R4       | Flex sensor resistance — Pinky     | Ω      |

**Expected resistance ranges** with a 10kΩ fixed resistor:
- Finger straight: ~10,000–25,000 Ω
- Finger fully bent: ~60,000–110,000 Ω

To slow down the print rate, increase `PRINT_INTERVAL` at the top of `receiver.py` (default `0.1` seconds).

---

## Troubleshooting

**Device not found during scan**
- Confirm the board is powered and the red LED is blinking
- Make sure BLE is enabled on your laptop
- Move within ~5 metres of the board

**IMU init failed (rapid red blink on boot)**
- Confirm you are using the **mbed-enabled** board package
- Confirm the **Seeed Arduino LSM6DS3** library is installed (not `Arduino_LSM6DS3`)

**Upload fails / port not found**
- Try a different USB-C cable (some cables are power-only)
- On Windows, you may need to install the [Seeed USB driver](https://wiki.seeedstudio.com/XIAO_BLE/)

**Flex sensors read very high resistance (~999999 Ω)**
- Check the voltage divider wiring — the most common mistake is connecting both ends of the flex sensor to 3.3V and GND without the 10kΩ resistor to ground
- Confirm the signal wire is connected to the correct ADC pin

**Serial not compiling**
- The mbed board package handles this automatically. If using non-mbed, add `#include <Adafruit_TinyUSB.h>` at the top of the sketch.
