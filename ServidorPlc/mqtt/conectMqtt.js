// mqttService.js
const mqtt = require("mqtt");

const brokerUrl = process.env.BROKER;
console.log(`📡 Conectando a broker MQTT: ${brokerUrl}`);

const options = {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  clientId: `NodeClient_${Math.random().toString(16).substring(2, 8)}`,
  reconnectPeriod: 2000, // Intentar reconectar cada 2 segundos
  clean: true, // Sesión limpia
};

const mqttClient = mqtt.connect(brokerUrl, options);

// Buffer opcional
const mensajesPorTopic = {};
const MAX_MENSAJES = 1000;

// Publicar
function publicarMQTT(topic, mensaje) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, mensaje, { qos: 1 }, (err) => {
      if (err) console.error(`❌ Error al publicar en ${topic}:`, err);
      else return //console.log(`📤 Publicado en ${topic}: ${mensaje}`);
    });
  } else {
    // Evitar loop infinito con logger
    // process.stdout.write("⚠️ Cliente MQTT no conectado\n");
  }
}

// Suscribirse a lista de tópicos con callback
function suscribirTopics(topics, handler) {
  mqttClient.on("connect", () => {
    topics.forEach((topic) => {
      mqttClient.subscribe(topic, { qos: 1 }, (err) => {
        if (err) console.error(`❌ Error suscribiéndose a ${topic}:`, err);
        else console.log(`📡 Suscrito a ${topic}`);
      });
    });
  });

  mqttClient.on("message", (topic, message) => {
    const msg = message.toString();

    // Guardar en buffer
    if (!mensajesPorTopic[topic]) mensajesPorTopic[topic] = [];
    mensajesPorTopic[topic].push({ msg, timestamp: Date.now() });
    if (mensajesPorTopic[topic].length > MAX_MENSAJES) {
      mensajesPorTopic[topic].shift();
    }

    // Pasar a handler
    if (handler) handler(topic, msg);
  });
}

mqttClient.on("error", (err) => {
  console.error("🚨 Error MQTT:", err);
});

module.exports = {
  mqttClient,
  publicarMQTT,
  suscribirTopics,
  mensajesPorTopic,
};
