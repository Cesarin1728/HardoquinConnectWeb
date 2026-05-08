#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "Alex’s iPhone";
const char* password = "123456789";
const char* serverUrl = "http://172.20.10.7:3000/datos";

#define TRIG_PIN 5
#define ECHO_PIN 18

const float RADIO        = 9.75;
const float ALTURA_TOTAL = 14.0;
const float PI_CONST     = 3.141592;
const float AREA_BASE    = PI_CONST * RADIO * RADIO;

float alturaAnterior = 0;
unsigned long tiempoAnterior = 0;
int nivelLluvia1a10 = 0;
const unsigned long intervaloMedicion = 60000;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado exitosamente a " + String(ssid));
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
    if (d > 0) { suma += d; validas++; }
    delay(10);
  }

  if (validas > 0 && WiFi.status() == WL_CONNECTED) {
    float distancia  = suma / validas;
    float alturaAgua = constrain(ALTURA_TOTAL - distancia, 0, ALTURA_TOTAL);
    float volumenL   = (AREA_BASE * alturaAgua) / 1000.0;
    float laminaMm   = alturaAgua * 10.0;

    //CÁLCULO DE INTENSIDAD
    unsigned long tiempoActual = millis(); //milis() viene junto a las boards que descargamos de ESP32, si no lo tienen no funciona
    if (tiempoActual - tiempoAnterior >= intervaloMedicion) {
        float deltaMm = (alturaAgua - alturaAnterior) * 10.0; // cm a mm
        if (deltaMm < 0) deltaMm = 0; // Si el nivel bajó, es porque la cubeta se vacióß

        // Calculamos intensidad en a 1 hora (mm/h)
        float intensidadMmH = deltaMm * (3600000.0 / (tiempoActual - tiempoAnterior));
        
        // Mapeo: 0 mm/h = Nivel 0 | 50 mm/h (tormenta extrema) = Nivel 10
        nivelLluvia1a10 = constrain(map(intensidadMmH, 0, 50, 0, 10), 0, 10);
        
        alturaAnterior = alturaAgua;
        tiempoAnterior = tiempoActual;
    }

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"distancia\":" + String(distancia) + ",\"altura\":" + String(alturaAgua) + ",\"volumen\":" + String(volumenL) + ",\"lluvia\":" + String(laminaMm) + ",\"nivel\":" + String(nivelLluvia1a10 * 10) + "}";

    int httpResponseCode = http.POST(jsonPayload);
    http.end();
  }
  delay(2000);
}