// ============================================================
//  Flex Sensor Debug — prints raw ADC and computed resistance
//  to Serial Monitor at 115200 baud.
//
//  No IMU, no BLE — just the flex sensors.
//
//  Wiring (same as main sketch):
//    3.3V ──── [Flex Sensor] ──── signal ──── [47kΩ] ──── GND
//                                    ↑
//                                  ADC pin
//
//  Finger   Pin
//  ──────   ───
//  Thumb    A0
//  Index    A1
//  Middle   A2
//  Ring     A3
//  Pinky    A4
// ============================================================

const int   FLEX_PINS[5]  = { A0, A1, A2, A3, A4 };
const char* FINGER_NAMES[5] = { "Pinky", "Ring", "Middle", "Index", "Thumb" };

const float R_FIXED  = 25000.0f;  // 47kΩ fixed resistor (match your wiring)
const float V_SUPPLY = 3.3f;
const float ADC_MAX  = 4095.0f;   // 12-bit ADC

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  for (int i = 0; i < 5; i++) {
    pinMode(FLEX_PINS[i], INPUT);
  }

  Serial.println("Pinky\tRing\tMiddle\tIndex\tThumb");
}

void loop() {
  for (int i = 0; i < 5; i++) {
    int   raw  = analogRead(FLEX_PINS[i]);
    float vOut = raw * V_SUPPLY / ADC_MAX;
    float res  = (vOut < 0.001f) ? 999999.0f
                                 : R_FIXED * (V_SUPPLY - vOut) / vOut;

    Serial.print(raw);
    if (i < 4) Serial.print("\t");
  }
  Serial.println();

  delay(100);  // 10 Hz — change as needed
}
