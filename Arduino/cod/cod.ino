#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "INFINITUM61B2";
const char* password = "4uEXG4aDCJ";
const char* serverUrl = "http://192.168.1.140:3000/datos";

#define TRIG_PIN 5
#define ECHO_PIN 18

const float RADIO        = 13.0;
const float ALTURA_TOTAL = 35.0;
const float PI_CONST     = 3.141592;
const float AREA_BASE    = PI_CONST * RADIO * RADIO;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Conexión WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n¡Conectado exitosamente!");
}

float medirDistancia() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duracion = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duracion == 0) return -1;
  return (duracion * 0.0343) / 2.0;
}

void loop() {
  float suma = 0;
  int validas = 0;

  for (int i = 0; i < 10; i++) {
    float d = medirDistancia();
    if (d > 0) {
      suma += d;
      validas++;
    }
    delay(10);
  }

  if (validas > 0 && WiFi.status() == WL_CONNECTED) {
    float distancia  = suma / validas;
    float alturaAgua = constrain(ALTURA_TOTAL - distancia, 0, ALTURA_TOTAL);
    float volumenL   = (AREA_BASE * alturaAgua) / 1000.0;
    float laminaMm   = alturaAgua * 10.0;

    // --- ENVÍO AL SERVIDOR NODE.JS ---
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Creamos el JSON con tus variables
    String jsonPayload = "{\"distancia\":" + String(distancia) + 
                         ",\"altura\":" + String(alturaAgua) + 
                         ",\"volumen\":" + String(volumenL) + 
                         ",\"lluvia\":" + String(laminaMm) + "}";

    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.print("Datos enviados. Respuesta: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error enviando POST: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }

  delay(2000); // Espera 2 segundos para la siguiente ráfaga de lecturas
}