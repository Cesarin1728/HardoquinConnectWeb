#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLEServer          *pServer          = NULL;
BLECharacteristic  *pTxCharacteristic = NULL;
bool deviceConnected    = false;
bool oldDeviceConnected = false;

#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

#define TRIG_PIN 5
#define ECHO_PIN 18

const float ALTURA_TOTAL_CM = 20.5f;   
const float RADIO_CM        = 10.5f;   
const float PI_             = 3.14159f;
const float AREA_BASE_CM2   = PI_ * RADIO_CM * RADIO_CM; 
const float VOLUMEN_MAX_L   = (AREA_BASE_CM2 * ALTURA_TOTAL_CM) / 1000.0f; 

const unsigned long DURACION_SESION_MS = 10UL * 60UL * 1000UL; 
unsigned long tiempoInicio     = 0;
bool sesionActiva              = false;
bool sesionTerminada           = false;
float alturaInicialCm          = 0.0f;  
int   nivelPorcentaje          = 0;     

class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        Serial.println("Cliente BLE conectado Sincronizando datos almacenados...");
        
        char txString[8];
        dtostrf(nivelPorcentaje, 1, 0, txString);
        pTxCharacteristic->setValue(txString);
        pTxCharacteristic->notify();
    }
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        Serial.println("Cliente BLE desconectado");
    }
};

float medirDistancia() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long dur = pulseIn(ECHO_PIN, HIGH, 30000);
    if (dur == 0) return -1.0f;
    return (dur * 0.0343f) / 2.0f;
}

float medirDistanciaFiltrada() {
    const int N = 9;
    float m[N];
    for (int i = 0; i < N; i++) {
        m[i] = medirDistancia();
        delay(15);
    }
    for (int i = 0; i < N - 1; i++)
        for (int j = i + 1; j < N; j++)
            if (m[i] > m[j]) { float t = m[i]; m[i] = m[j]; m[j] = t; }
    return m[N / 2];
}

float medirAlturaAgua() {
    float distancia = medirDistanciaFiltrada();
    
    if (distancia <= 2.0f || distancia > ALTURA_TOTAL_CM) {
        return -1.0f; 
    }
    
    float altura = ALTURA_TOTAL_CM - distancia;
    return constrain(altura, 0.0f, ALTURA_TOTAL_CM);
}

int calcularPorcentajeTiempoReal(float alturaActualCm) {
    float deltaAltura = alturaActualCm - alturaInicialCm;
    if (deltaAltura < 0.0f) deltaAltura = 0.0f; 

    float volumenCm3 = AREA_BASE_CM2 * deltaAltura;
    float volumenL   = volumenCm3 / 1000.0f;

    float porcentajeCrudo = (volumenL / VOLUMEN_MAX_L) * 100.0f;
    porcentajeCrudo = constrain(porcentajeCrudo, 0.0f, 100.0f);

    int porcentajeCalculado = (int)porcentajeCrudo;
    int porcentajeSuavizado = (int)((nivelPorcentaje * 0.80) + (porcentajeCalculado * 0.20));

    Serial.printf("[Midiendo] h: %.2f cm | Vol: %.3fL / %.2fL | %% Activo: %d\n", 
                  alturaActualCm, volumenL, VOLUMEN_MAX_L, porcentajeSuavizado);

    return porcentajeSuavizado;
}

void setup() {
    Serial.begin(115200);
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);

    BLEDevice::init("RainSense_ESP32");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);
    pTxCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID_TX,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pTxCharacteristic->addDescriptor(new BLE2902());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("ESP32 BLE iniciado de fondo.");
    Serial.println("Estabilizando sensor para lectura base...");
    delay(1500); 
    
    float lecturaInicial = medirAlturaAgua();
    alturaInicialCm = (lecturaInicial >= 0.0f) ? lecturaInicial : 0.0f;
    
    tiempoInicio = millis();
    sesionActiva = true;
    sesionTerminada = false;
    nivelPorcentaje = 0;
    
    Serial.printf("¡Sesión Iniciada! Nivel inicial: %.2f cm. Cronómetro de 10 min corriendo...\n", alturaInicialCm);
}

void loop() {
    unsigned long ahora = millis();

    if (sesionActiva && !sesionTerminada) {
        unsigned long transcurrido = ahora - tiempoInicio;

        if (transcurrido >= DURACION_SESION_MS) {
            sesionTerminada = true;
            sesionActiva    = false;
            
            Serial.printf("\n========================Tan tan=========\n");
            Serial.printf(" Porcentaje final guardado: %d%%\n", nivelPorcentaje);
            Serial.printf(" Para reiniciar, apague y prenda el ESP32.\n");
            Serial.printf("=========================================\n");
            
            if (deviceConnected) {
                char txString[8];
                dtostrf(nivelPorcentaje, 1, 0, txString);
                pTxCharacteristic->setValue(txString);
                pTxCharacteristic->notify();
            }
        } else {
            float alturaActual = medirAlturaAgua();
            if (alturaActual >= 0) {
                nivelPorcentaje = calcularPorcentajeTiempoReal(alturaActual);
                
                if (deviceConnected) {
                    char txString[8];
                    dtostrf(nivelPorcentaje, 1, 0, txString);
                    pTxCharacteristic->setValue(txString);
                    pTxCharacteristic->notify();
                }
            }
            delay(250); 
        }
    }

    if (sesionTerminada && deviceConnected) {
        static unsigned long ultimoRefresco = 0;
        if (ahora - ultimoRefresco > 2000) { 
            ultimoRefresco = ahora;
            char txString[8];
            dtostrf(nivelPorcentaje, 1, 0, txString);
            pTxCharacteristic->setValue(txString);
            pTxCharacteristic->notify(); 
        }
    }

    if (!deviceConnected && oldDeviceConnected) {
        delay(500);
        pServer->startAdvertising();
        Serial.println("Reanunciando señal BLE para sincronizaciones tardías");
        oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }
}

// #include <BLEDevice.h>
// #include <BLEServer.h>
// #include <BLEUtils.h>
// #include <BLE2902.h>

// BLEServer          *pServer          = NULL;
// BLECharacteristic  *pTxCharacteristic = NULL;
// bool deviceConnected    = false;
// bool oldDeviceConnected = false;

// #define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
// #define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

// #define TRIG_PIN 5
// #define ECHO_PIN 18

// const float ALTURA_TOTAL_CM = 20.5f;   
// const float RADIO_CM        = 10.5f;   
// const float PI_             = 3.14159f;
// const float AREA_BASE_CM2   = PI_ * RADIO_CM * RADIO_CM; 
// const float VOLUMEN_MAX_L   = (AREA_BASE_CM2 * ALTURA_TOTAL_CM) / 1000.0f; 

// const unsigned long DURACION_SESION_MS = 11UL * 60UL * 1000UL; 
// const unsigned long TIEMPO_REAJUSTE_MS = 1UL * 60UL * 1000UL;  

// unsigned long tiempoInicio     = 0;
// bool sesionActiva              = false;
// bool sesionTerminada           = false;
// bool medidaReajustada          = false; 
// float alturaInicialCm          = 0.0f;  
// int   nivelPorcentaje          = 0;     

// class MyServerCallbacks : public BLEServerCallbacks {
//     void onConnect(BLEServer* pServer) {
//         deviceConnected = true;
//         Serial.println("Cliente BLE conectado Sincronizando datos almacenados...");
        
//         char txString[8];
//         dtostrf(nivelPorcentaje, 1, 0, txString);
//         pTxCharacteristic->setValue(txString);
//         pTxCharacteristic->notify();
//     }
//     void onDisconnect(BLEServer* pServer) {
//         deviceConnected = false;
//         Serial.println("Cliente BLE desconectado");
//     }
// };

// float medirDistancia() {
//     digitalWrite(TRIG_PIN, LOW);
//     delayMicroseconds(2);
//     digitalWrite(TRIG_PIN, HIGH);
//     delayMicroseconds(10);
//     digitalWrite(TRIG_PIN, LOW);

//     long dur = pulseIn(ECHO_PIN, HIGH, 30000);
//     if (dur == 0) return -1.0f;
//     return (dur * 0.0343f) / 2.0f;
// }

// float medirDistanciaFiltrada() {
//     const int N = 9;
//     float m[N];
//     for (int i = 0; i < N; i++) {
//         m[i] = medirDistancia();
//         delay(15);
//     }
//     for (int i = 0; i < N - 1; i++)
//         for (int j = i + 1; j < N; j++)
//             if (m[i] > m[j]) { float t = m[i]; m[i] = m[j]; m[j] = t; }
//     return m[N / 2];
// }

// float medirAlturaAgua() {
//     float distancia = medirDistanciaFiltrada();
    
//     if (distancia <= 2.0f || distancia > ALTURA_TOTAL_CM) {
//         return -1.0f; 
//     }
    
//     float altura = ALTURA_TOTAL_CM - distancia;
//     return constrain(altura, 0.0f, ALTURA_TOTAL_CM);
// }

// int calcularPorcentajeTiempoReal(float alturaActualCm) {
//     float deltaAltura = alturaActualCm - alturaInicialCm;
//     if (deltaAltura < 0.0f) deltaAltura = 0.0f; 

//     float volumenCm3 = AREA_BASE_CM2 * deltaAltura;
//     float volumenL   = volumenCm3 / 1000.0f;

//     float porcentajeCrudo = (volumenL / VOLUMEN_MAX_L) * 100.0f;
//     porcentajeCrudo = constrain(porcentajeCrudo, 0.0f, 100.0f);

//     int porcentajeCalculado = (int)porcentajeCrudo;
//     int porcentajeSuavizado = (int)((nivelPorcentaje * 0.80) + (porcentajeCalculado * 0.20));

//     Serial.printf("[Midiendo] h: %.2f cm | Vol: %.3fL / %.2fL | %% Activo: %d\n", 
//                   alturaActualCm, volumenL, VOLUMEN_MAX_L, porcentajeSuavizado);

//     return porcentajeSuavizado;
// }

// void setup() {
//     Serial.begin(115200);
//     pinMode(TRIG_PIN, OUTPUT);
//     pinMode(ECHO_PIN, INPUT);

//     BLEDevice::init("RainSense_ESP32");
//     pServer = BLEDevice::createServer();
//     pServer->setCallbacks(new MyServerCallbacks());

//     BLEService *pService = pServer->createService(SERVICE_UUID);
//     pTxCharacteristic = pService->createCharacteristic(
//         CHARACTERISTIC_UUID_TX,
//         BLECharacteristic::PROPERTY_NOTIFY
//     );
//     pTxCharacteristic->addDescriptor(new BLE2902());
//     pService->start();

//     BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
//     pAdvertising->addServiceUUID(SERVICE_UUID);
//     pAdvertising->setScanResponse(true);
//     pAdvertising->setMinPreferred(0x06);
//     pAdvertising->setMinPreferred(0x12);
//     BLEDevice::startAdvertising();

//     Serial.println("ESP32 BLE iniciado de fondo.");
//     Serial.println("Estabilizando sensor para lectura base...");
//     delay(1500); 
    
//     float lecturaInicial = medirAlturaAgua();
//     alturaInicialCm = (lecturaInicial >= 0.0f) ? lecturaInicial : 0.0f;
    
//     tiempoInicio = millis();
//     sesionActiva = true;
//     sesionTerminada = false;
//     medidaReajustada = false;
//     nivelPorcentaje = 0;
    
//     Serial.printf("¡Sesión Iniciada! Nivel inicial: %.2f cm. Cronómetro de 11 min corriendo...\n", alturaInicialCm);
// }

// void loop() {
//     unsigned long ahora = millis();

//     if (sesionActiva && !sesionTerminada) {
//         unsigned long transcurrido = ahora - tiempoInicio;

//         if (!medidaReajustada && transcurrido >= TIEMPO_REAJUSTE_MS) {
//             float nuevaLectura = medirAlturaAgua();
//             if (nuevaLectura >= 0.0f) {
//                 alturaInicialCm = nuevaLectura;
//                 medidaReajustada = true;
//                 nivelPorcentaje = 0; 
//                 Serial.printf("\n*** MINUTO 1 ALCANZADO ***\n");
//                 Serial.printf("Nueva medida base fijada: %.2f cm\n", alturaInicialCm);
//             }
//         }

//         if (transcurrido >= DURACION_SESION_MS) {
//             sesionTerminada = true;
//             sesionActiva    = false;
            
//             Serial.printf("\n========================Tan tan=========\n");
//             Serial.printf(" Porcentaje final guardado: %d%%\n", nivelPorcentaje);
//             Serial.printf(" Para reiniciar, apague y prenda el ESP32.\n");
//             Serial.printf("=========================================\n");
            
//             if (deviceConnected) {
//                 char txString[8];
//                 dtostrf(nivelPorcentaje, 1, 0, txString);
//                 pTxCharacteristic->setValue(txString);
//                 pTxCharacteristic->notify();
//             }
//         } else {
//             float alturaActual = medirAlturaAgua();
//             if (alturaActual >= 0) {
//                 nivelPorcentaje = calcularPorcentajeTiempoReal(alturaActual);
                
//                 if (deviceConnected) {
//                     char txString[8];
//                     dtostrf(nivelPorcentaje, 1, 0, txString);
//                     pTxCharacteristic->setValue(txString);
//                     pTxCharacteristic->notify();
//                 }
//             }
//             delay(250); 
//         }
//     }

//     if (sesionTerminada && deviceConnected) {
//         static unsigned long ultimoRefresco = 0;
//         if (ahora - ultimoRefresco > 2000) { 
//             ultimoRefresco = ahora;
//             char txString[8];
//             dtostrf(nivelPorcentaje, 1, 0, txString);
//             pTxCharacteristic->setValue(txString);
//             pTxCharacteristic->notify(); 
//         }
//     }

//     if (!deviceConnected && oldDeviceConnected) {
//         delay(500);
//         pServer->startAdvertising();
//         Serial.println("Reanunciando señal BLE para sincronizaciones tardías");
//         oldDeviceConnected = deviceConnected;
//     }
//     if (deviceConnected && !oldDeviceConnected) {
//         oldDeviceConnected = deviceConnected;
//     }
// }