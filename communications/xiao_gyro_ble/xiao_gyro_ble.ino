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
//    "ROLL,PITCH,YAW,ACCEL_MAG\n"            <- flex sensors commented out
//    "ROLL,PITCH,YAW,ACCEL_MAG,R0,R1,R2,R3,R4\n"  <- when flex sensors enabled
//
//    ROLL/PITCH/YAW  — degrees
//    ACCEL_MAG       — total acceleration magnitude (m/s²)
//    R0–R4           — flex resistance in Ohms, thumb → pinky (commented out)
//
//  ── FLEX SENSOR WIRING (for when you're ready) ──────────────
//    3.3V ──── [Flex Sensor] ──── signal ──── [10kΩ] ──── GND
//
//    Finger   Pin
//    ──────   ───
//    Thumb    A0
//    Index    A1
//    Middle   A2
//    Ring     A3
//    Pinky    A4
//
//  To enable flex sensors: uncomment all lines marked FLEX
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
const float SAMPLE_S = 0.02f;   // 20ms = 50 Hz, in seconds

float roll  = 0.0f;
float pitch = 0.0f;
float yaw   = 0.0f;

// ── Flex sensors (COMMENTED OUT — uncomment when installed) ──
// const int   FLEX_PINS[5] = { A0, A1, A2, A3, A4 };  // FLEX
// const float R_FIXED = 47000.0f;  // 47kΩ fixed resistor
// const float V_SUPPLY     = 3.3f;                      // FLEX
// const float ADC_MAX      = 4095.0f;                   // FLEX

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
  float accel_roll  = atan2(ay, az)              * 180.0f / M_PI;
  float accel_pitch = atan2(-ax, sqrt(ay*ay + az*az)) * 180.0f / M_PI;

  // Fuse: trust gyro for fast motion, nudge toward accel for slow drift
  roll  = ALPHA * gyro_roll  + (1.0f - ALPHA) * accel_roll;
  pitch = ALPHA * gyro_pitch + (1.0f - ALPHA) * accel_pitch;

  // Yaw: gyro only — no absolute reference without a magnetometer
  yaw = gyro_yaw;

  // Keep yaw in [-180, 180] range to avoid unbounded growth
  if (yaw >  180.0f) yaw -= 360.0f;
  if (yaw < -180.0f) yaw += 360.0f;
}


// ════════════════════════════════════════════════════════════
//  Flex sensor resistance from ADC reading  (COMMENTED OUT)
// ════════════════════════════════════════════════════════════
// float readFlexResistance(int pin) {                         // FLEX
//   int raw    = analogRead(pin);                             // FLEX
//   float vOut = raw * V_SUPPLY / ADC_MAX;                   // FLEX
//   if (vOut < 0.001f) return 999999.0f;                     // FLEX
//   return R_FIXED * (V_SUPPLY - vOut) / vOut;               // FLEX
// }                                                           // FLEX


// ════════════════════════════════════════════════════════════
//  Setup
// ════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);

  pinMode(LED_RED,   OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  digitalWrite(LED_RED,   HIGH);
  digitalWrite(LED_GREEN, HIGH);

  // FLEX: uncomment when flex sensors are wired up
  // for (int i = 0; i < 5; i++) {           // FLEX
  //   pinMode(FLEX_PINS[i], INPUT);          // FLEX
  // }                                        // FLEX

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

  Serial.println("Advertising as \"HandMusic\"...");
}


// ════════════════════════════════════════════════════════════
//  Main Loop
// ════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();
  BLEDevice central = BLE.central();

  if (central && central.connected()) {
    digitalWrite(LED_RED,   HIGH);
    digitalWrite(LED_GREEN, LOW);

    if (now - lastSendMs >= 20) {  // 50 Hz
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

      // ── Flex sensors (COMMENTED OUT) ────────────────────
      // float r[5];                                          // FLEX
      // for (int i = 0; i < 5; i++) {                       // FLEX
      //   r[i] = readFlexResistance(FLEX_PINS[i]);          // FLEX
      // }                                                    // FLEX

      // Format packet — swap to the flex version when ready
      char packet[128];

      // Current format (no flex):
      snprintf(packet, sizeof(packet),
               "%.2f,%.2f,%.2f,%.2f\n",
               roll, pitch, yaw, accelMag);

      // FLEX: replace the snprintf above with this when flex sensors are installed:
      // snprintf(packet, sizeof(packet),                                              // FLEX
      //          "%.2f,%.2f,%.2f,%.2f,%.0f,%.0f,%.0f,%.0f,%.0f\n",                 // FLEX
      //          roll, pitch, yaw, accelMag,                                         // FLEX
      //          r[0], r[1], r[2], r[3], r[4]);                                      // FLEX

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
