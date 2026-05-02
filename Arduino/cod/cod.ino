#define TRIG_PIN 5
#define ECHO_PIN 18

const float RADIO        = 13.0;
const float ALTURA_TOTAL = 35.0;
const float PI_CONST     = 3.141592;
const float AREA_BASE    = PI_CONST * RADIO * RADIO;  // 530.93 cm²

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  Serial.println("Dist(cm) | Agua(cm) | Vol(L) | Lluvia(mm)");
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
  // Promedio de 10 lecturas
  float suma = 0;
  int validas = 0;

  for (int i = 0; i < 10; i++) {
    float d = medirDistancia();
    if (d > 0) {
      suma += d;
      validas++;
    }
    delay(10);
  } //Tontuelo el que lo lea

  if (validas == 0) {
    Serial.println("ERROR: sin lecturas válidas.");
    delay(1000);
    return;
  }

  float distancia  = suma / validas;
  float alturaAgua = ALTURA_TOTAL - distancia;
  if (alturaAgua < 0)            alturaAgua = 0;
  if (alturaAgua > ALTURA_TOTAL) alturaAgua = ALTURA_TOTAL;

  float volumenL  = (AREA_BASE * alturaAgua) / 1000.0;
  float laminaMm  = alturaAgua * 10.0;
  float porcentaje = (alturaAgua / ALTURA_TOTAL) * 100.0;

  Serial.print(distancia, 1);   Serial.print(" cm\t| ");
  Serial.print(alturaAgua, 1);  Serial.print(" cm\t| ");
  Serial.print(volumenL, 3);    Serial.print(" L\t| ");
  Serial.print(laminaMm, 1);    Serial.print(" mm\t| ");
  Serial.print(porcentaje, 1);  Serial.println(" %");

  delay(1000);
}