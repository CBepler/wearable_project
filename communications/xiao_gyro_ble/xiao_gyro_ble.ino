// ============================================================
//  XIAO nRF52840 Sense — Complementary Filter + Flex Sensors
// ============================================================
//
//  BOARD:    Seeed nRF52 mbed-enabled Boards > Seeed XIAO BLE Sense - nRF52840
//  LIBRARIES:
//    - ArduinoBLE (Library Manager)
//    - Seeed Arduino LSM6DS3 (install as .zip from github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3)
//
//  COMPLEMENTARY FILTER:
//    Fuses gyroscope and accelerometer to produce stable roll and pitch angles.
//    Yaw is raw integrated gyro (drifts over time — no magnetometer on this board).
//    alpha = 0.98 means 98% gyro, 2% accel correction each sample.
//
//  PACKET FORMAT (CSV, newline-terminated):
//    "ROLL,PITCH,YAW,ACCEL_MAG,R0\n"               <- 1 flex sensor active
//    "ROLL,PITCH,YAW,ACCEL_MAG,R0,R1,R2,R3,R4\n"  <- all 5 flex sensors active
//
//    ROLL/PITCH/YAW  — degrees
//    ACCEL_MAG       — total acceleration magnitude (m/s²)
//    R0–R4           — flex resistance in Ohms, thumb → pinky
//
//  ── FLEX SENSOR WIRING ───────────────────────────────────────
//    3.3V ──── [Flex Sensor] ──── signal ──── [47kΩ] ──── GND
//
//    Finger   Pin    Status
//    ──────   ───    ──────
//    Thumb    A0     INSTALLED
//    Index    A1     INSTALLED
//    Middle   A2     not yet installed
//    Ring     A3     not yet installed
//    Pinky    A4     not yet installed
//
//  To add more flex sensors: wire them up and increase NUM_FLEX
//
//  LED: Red blinks = advertising, Green solid = connected.
// ============================================================

#include "LSM6DS3.h"
#include "Wire.h"
#include <ArduinoBLE.h>
#include <math.h>

// ── IMU ──────────────────────────────────────────────────────
LSM6DS3 imu(I2C_MODE, 0x6A);

// ── Complementary filter ─────────────────────────────────────
// Increase alpha → smoother but slower to respond to fast motion
// Decrease alpha → more responsive but noisier
const float ALPHA    = 0.98f;
const float SAMPLE_S = 0.01f;   // 10ms = 100 Hz, in seconds

float roll  = 0.0f;
float pitch = 0.0f;
float yaw   = 0.0f;

// ── Flex sensors ─────────────────────────────────────────────
// NUM_FLEX controls how many are read and transmitted.
// Increase from 1 to 2, 3, 4, 5 as you install each sensor.
const int   NUM_FLEX         = 5;
const int   FLEX_PINS[5]     = { A0, A1, A2, A3, A4 };
const float R_FIXED          = 25000.0f;  // 47kΩ fixed resistor
const float V_SUPPLY         = 3.3f;
const float ADC_MAX          = 4095.0f;   // 12-bit ADC

// ── BLE Nordic UART Service ───────────────────────────────────
BLEService uartService("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
BLEStringCharacteristic txChar("6E400003-B5A3-F393-E0A9-E50E24DCCA9E", BLENotify, 128);
BLEStringCharacteristic rxChar("6E400002-B5A3-F393-E0A9-E50E24DCCA9E", BLEWrite,  128);

// ── Timing ───────────────────────────────────────────────────
unsigned long lastSendMs  = 0;
unsigned long lastBlinkMs = 0;


// ════════════════════════════════════════════════════════════
//  Complementary filter update
//  Call once per sample with raw gyro (deg/s) and accel (m/s²)
// ════════════════════════════════════════════════════════════
void updateFilter(float gx, float gy, float gz,
                  float ax, float ay, float az) {

  // Integrate gyroscope for all three axes
  float gyro_roll  = roll  + gx * SAMPLE_S;
  float gyro_pitch = pitch + gy * SAMPLE_S;
  float gyro_yaw   = yaw   + gz * SAMPLE_S;

  // Derive roll and pitch from accelerometer
  // atan2 gives angle in radians — convert to degrees
  float accel_roll  = atan2(ay, az)                    * 180.0f / M_PI;
  float accel_pitch = atan2(-ax, sqrt(ay*ay + az*az))  * 180.0f / M_PI;

  // Unwrap accel angles to match the gyro estimate so the atan2 ±180°
  // discontinuity does not yank the filter across the full range.
  while (accel_roll  - gyro_roll  >  180.0f) accel_roll  -= 360.0f;
  while (accel_roll  - gyro_roll  < -180.0f) accel_roll  += 360.0f;
  while (accel_pitch - gyro_pitch >  180.0f) accel_pitch -= 360.0f;
  while (accel_pitch - gyro_pitch < -180.0f) accel_pitch += 360.0f;

  // Fuse: trust gyro for fast motion, nudge toward accel for slow drift
  roll  = ALPHA * gyro_roll  + (1.0f - ALPHA) * accel_roll;
  pitch = ALPHA * gyro_pitch + (1.0f - ALPHA) * accel_pitch;

  // Yaw: gyro only — no absolute reference without a magnetometer
  yaw = gyro_yaw;

  // Clamp all axes to [-180, 180] so they stick at the extremes
  // instead of wrapping around and snapping to the opposite value.
  if (roll  >  180.0f) roll  =  180.0f;
  if (roll  < -180.0f) roll  = -180.0f;
  if (pitch >  180.0f) pitch =  180.0f;
  if (pitch < -180.0f) pitch = -180.0f;
  if (yaw   >  180.0f) yaw   =  180.0f;
  if (yaw   < -180.0f) yaw   = -180.0f;
}


// ════════════════════════════════════════════════════════════
//  Flex sensor resistance from ADC reading
// ════════════════════════════════════════════════════════════
float readFlexResistance(int pin) {
  int raw    = analogRead(pin);
  float vOut = raw * V_SUPPLY / ADC_MAX;
  if (vOut < 0.001f) return 999999.0f;  // avoid divide-by-zero
  return R_FIXED * (V_SUPPLY - vOut) / vOut;
}


// ════════════════════════════════════════════════════════════
//  Setup
// ════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  pinMode(LED_RED,   OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  digitalWrite(LED_RED,   HIGH);
  digitalWrite(LED_GREEN, HIGH);

  for (int i = 0; i < NUM_FLEX; i++) {
    pinMode(FLEX_PINS[i], INPUT);
  }

  if (imu.begin() != 0) {
    Serial.println("IMU init failed!");
    while (true) {
      digitalWrite(LED_RED, !digitalRead(LED_RED));
      delay(100);
    }
  }
  Serial.println("IMU ready.");

  if (!BLE.begin()) {
    Serial.println("BLE init failed!");
    while (true);
  }

  BLE.setLocalName("HandMusic");
  BLE.setAdvertisedService(uartService);
  uartService.addCharacteristic(txChar);
  uartService.addCharacteristic(rxChar);
  BLE.addService(uartService);
  BLE.advertise();

  // Request a fast connection interval for low-latency instrument response.
  // Parameters: min 7.5ms, max 15ms (in units of 1.25ms → 0x0006, 0x000C)
  BLE.setConnectionInterval(0x0006, 0x000C);

  Serial.println("Advertising as \"HandMusic\"...");
}


// ════════════════════════════════════════════════════════════
//  Main Loop
// ════════════════════════════════════════════════════════════
void loop() {

  Serial.print("A0:"); Serial.print(analogRead(A0));
  Serial.print(" A1:"); Serial.print(analogRead(A1));
  Serial.print(" A2:"); Serial.print(analogRead(A2));
  Serial.print(" A3:"); Serial.print(analogRead(A3));
  Serial.print(" A4:"); Serial.println(analogRead(A4));
  unsigned long now = millis();
  BLEDevice central = BLE.central();

  if (central && central.connected()) {
    digitalWrite(LED_RED,   HIGH);
    digitalWrite(LED_GREEN, LOW);

    if (now - lastSendMs >= 10) {  // 100 Hz
      lastSendMs = now;

      // Read raw IMU
      float gx = imu.readFloatGyroX();
      float gy = imu.readFloatGyroY();
      float gz = imu.readFloatGyroZ();
      float ax = imu.readFloatAccelX() * 9.80665f;
      float ay = imu.readFloatAccelY() * 9.80665f;
      float az = imu.readFloatAccelZ() * 9.80665f;

      // Update complementary filter
      updateFilter(gx, gy, gz, ax, ay, az);

      // Acceleration magnitude — useful for detecting gesture intensity
      float accelMag = sqrt(ax*ax + ay*ay + az*az);

      // Read however many flex sensors are currently installed
      float r[5] = {0};
      for (int i = 0; i < NUM_FLEX; i++) {
        r[i] = readFlexResistance(FLEX_PINS[i]);
      }

      // Build packet: IMU fields first, then NUM_FLEX resistance values
      char packet[128];
      int len = snprintf(packet, sizeof(packet),
                         "%.2f,%.2f,%.2f,%.2f",
                         roll, pitch, yaw, accelMag);
      for (int i = 0; i < NUM_FLEX; i++) {
        len += snprintf(packet + len, sizeof(packet) - len, ",%.0f", r[i]);
      }
      snprintf(packet + len, sizeof(packet) - len, "\n");

      txChar.writeValue(String(packet));
      Serial.print(packet);
    }

  } else {
    digitalWrite(LED_GREEN, HIGH);
    if (now - lastBlinkMs >= 500) {
      lastBlinkMs = now;
      digitalWrite(LED_RED, !digitalRead(LED_RED));
    }
  }
}
