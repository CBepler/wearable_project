// ============================================================
//  XIAO nRF52840 Sense — Gyro-only Rotation Test (no flex)
// ============================================================
//
//  BOARD:    Seeed nRF52 mbed-enabled Boards > Seeed XIAO BLE Sense - nRF52840
//  LIBRARIES:
//    - ArduinoBLE (Library Manager)
//    - Seeed Arduino LSM6DS3 (install as .zip from github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3)
//
//  PACKET FORMAT (CSV, newline-terminated):
//    "ROLL,PITCH,YAW,ACCEL_MAG\n"
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
const float ALPHA    = 0.98f;
const float SAMPLE_S = 0.01f;   // 10ms = 100 Hz

float roll  = 0.0f;
float pitch = 0.0f;
float yaw   = 0.0f;

// ── BLE Nordic UART Service ───────────────────────────────────
BLEService uartService("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
BLEStringCharacteristic txChar("6E400003-B5A3-F393-E0A9-E50E24DCCA9E", BLENotify, 128);
BLEStringCharacteristic rxChar("6E400002-B5A3-F393-E0A9-E50E24DCCA9E", BLEWrite,  128);

// ── Timing ───────────────────────────────────────────────────
unsigned long lastSendMs  = 0;
unsigned long lastBlinkMs = 0;


void updateFilter(float gx, float gy, float gz,
                  float ax, float ay, float az) {

  float gyro_roll  = roll  + gx * SAMPLE_S;
  float gyro_pitch = pitch + gy * SAMPLE_S;
  float gyro_yaw   = yaw   + gz * SAMPLE_S;

  float accel_roll  = atan2(ay, az)                    * 180.0f / M_PI;
  float accel_pitch = atan2(-ax, sqrt(ay*ay + az*az))  * 180.0f / M_PI;

  roll  = ALPHA * gyro_roll  + (1.0f - ALPHA) * accel_roll;
  pitch = ALPHA * gyro_pitch + (1.0f - ALPHA) * accel_pitch;

  yaw = gyro_yaw;

  if (yaw >  180.0f) yaw -= 360.0f;
  if (yaw < -180.0f) yaw += 360.0f;
}


void setup() {
  Serial.begin(115200);
  pinMode(LED_RED,   OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  digitalWrite(LED_RED,   HIGH);
  digitalWrite(LED_GREEN, HIGH);

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

  BLE.setConnectionInterval(0x0006, 0x000C);

  Serial.println("Advertising as \"HandMusic\"...");
}


void loop() {
  unsigned long now = millis();
  BLEDevice central = BLE.central();

  if (central && central.connected()) {
    digitalWrite(LED_RED,   HIGH);
    digitalWrite(LED_GREEN, LOW);

    if (now - lastSendMs >= 10) {  // 100 Hz
      lastSendMs = now;

      float gx = imu.readFloatGyroX();
      float gy = imu.readFloatGyroY();
      float gz = imu.readFloatGyroZ();
      float ax = imu.readFloatAccelX() * 9.80665f;
      float ay = imu.readFloatAccelY() * 9.80665f;
      float az = imu.readFloatAccelZ() * 9.80665f;

      updateFilter(gx, gy, gz, ax, ay, az);

      float accelMag = sqrt(ax*ax + ay*ay + az*az);

      char packet[128];
      snprintf(packet, sizeof(packet),
               "%.2f,%.2f,%.2f,%.2f\n",
               roll, pitch, yaw, accelMag);

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
