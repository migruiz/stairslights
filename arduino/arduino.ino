#include <ESP8266WiFi.h>
#include <PubSubClient.h>
 
const char* ssid = "VM712429A";
const char* password =  "tBhj6Hxe7abj";
const char* mqttServer = "192.168.0.11";
const int mqttPort = 1883;
const char* mqttUser = "YourMqttUser";
const char* mqttPassword = "YourMqttUserPassword";
 
WiFiClient espClient;
PubSubClient  (espClient);
int pin = 2;


void WIFI_Connect()
{
  WiFi.disconnect();
      WiFi.begin(ssid, password);
      while (WiFi.status() != WL_CONNECTED) {
          delay(500);
        Serial.println("Connecting to WiFi..");
      }
      Serial.println("Connected to the WiFi network");

  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback); 
  while (!client.connected()) {
    Serial.println("Connecting to MQTT..."); 
    if (client.connect("ESP8266Client", mqttUser, mqttPassword )) { 
      Serial.println("connected");   
    } else { 
      Serial.print("failed with state ");
      Serial.print(client.state());
      delay(2000); 
    }
  } 
  client.publish("esp/front/door", "Hello from ESP8266");
  client.subscribe("esp/front/door/light");
}


void setup() {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, HIGH); 
  Serial.begin(115200);
  WIFI_Connect(); 
}
 
void callback(char* topic, byte* payload, unsigned int length) {
 
  Serial.print("Message arrived in topic: ");
  Serial.println(topic);
 
  Serial.print("Message:");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
 
  Serial.println();
  Serial.println("-----------------------");
  if (!strncmp((char *)payload, "on", length)) {
             digitalWrite(pin, LOW); 
    } else if (!strncmp((char *)payload, "off", length)) {
        digitalWrite(pin, HIGH); 
    }
}
 
void loop() {
  if (WiFi.status() != WL_CONNECTED)
    {
       WIFI_Connect();
       return;       
   }
   if (!client.connected()) {
      WIFI_Connect();
      return;
   }
  client.loop();

  
}
