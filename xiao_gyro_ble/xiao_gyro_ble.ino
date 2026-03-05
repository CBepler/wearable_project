// ============================================================
//  XIAO nRF52840 Sense — Gyroscope + Accelerometer over BLE
// ============================================================
//
//  BOARD:    Seeed nRF52 mbed-enabled Boards > Seeed XIAO BLE Sense - nRF52840
//  LIBRARIES:
//    - ArduinoBLE (Library Manager)
//    - Seeed Arduino LSM6DS3 (install as .zip from github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3)
//
//  Streams "GX,GY,GZ,AX,AY,AZ\n" at 50 Hz over BLE Nordic UART.
//  G = gyro (deg/s), A = accel (m/s^2)
//
//  LED: Red blinks = advertising, Green solid = connected.
// ============================================================

#include "LSM6DS3.h"
#include "Wire.h"
#include <ArduinoBLE.h>

// IMU on internal I2C bus (Wire1), address 0x6A
LSM6DS3 imu(I2C_MODE, 0x6A);

BLEService uartService("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
BLEStringCharacteristic txChar("6E400003-B5A3-F393-E0A9-E50E24DCCA9E", BLENotify, 64);
BLEStringCharacteristic rxChar("6E400002-B5A3-F393-E0A9-E50E24DCCA9E", BLEWrite,  64);

unsigned long lastSendMs  = 0;
unsigned long lastBlinkMs = 0;

void setup() {
  Serial.begin(115200);

  pinMode(LED_RED,   OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  digitalWrite(LED_RED,   HIGH);  // off (active-LOW)
  digitalWrite(LED_GREEN, HIGH);  // off

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

void loop() {
  unsigned long now = millis();
  BLEDevice central = BLE.central();

  if (central && central.connected()) {
    digitalWrite(LED_RED,   HIGH);  // off
    digitalWrite(LED_GREEN, LOW);   // on

    if (now - lastSendMs >= 20) {  // 50 Hz
      lastSendMs = now;

      float gx = imu.readFloatGyroX();
      float gy = imu.readFloatGyroY();
      float gz = imu.readFloatGyroZ();
      float ax = imu.readFloatAccelX() * 9.80665f;
      float ay = imu.readFloatAccelY() * 9.80665f;
      float az = imu.readFloatAccelZ() * 9.80665f;

      char packet[64];
      snprintf(packet, sizeof(packet),
               "%.2f,%.2f,%.2f,%.2f,%.2f,%.2f\n",
               gx, gy, gz, ax, ay, az);

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
