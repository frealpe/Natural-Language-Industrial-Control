// services/holonSupervisor.js
const { mqttClient, publicarMQTT } = require("../mqtt/conectMqtt");

// ======================================================
// 🔹 Tópicos del sistema holónico
// ======================================================
const TOPIC_MISION_CONTROL = "hms/mision/comando"; // Supervisor → Recursos
const TOPIC_OFERTAS = "hms/recurso/+/oferta";      // Recursos → Supervisor
const TOPIC_ESTADOS = "hms/recurso/+/estado";      // Estados periódicos

// ======================================================
// 🔹 Estados internos y misión
// ======================================================
const estadoRecursos = new Map(); // Mejor estructura para acceso por ID
let ofertasRecibidas = [];

let misionActual = {
  id: "MIS-TEST",
  tarea: "Pulido",
};

// ======================================================
// 🔌 CONEXIÓN MQTT
// ======================================================
mqttClient.on("connect", () => {
  // console.log("🔗 Supervisor conectado al broker MQTT");

  [TOPIC_OFERTAS, TOPIC_ESTADOS].forEach((topic) => {
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) console.error(`⚠️ Error al suscribirse a ${topic}:`, err.message);
    });
  });

  // Envía solicitud de ofertas inicial
  setTimeout(() => solicitarOfertas(misionActual), 3000);
});

// ======================================================
// 📨 RECEPCIÓN DE MENSAJES
// ======================================================
mqttClient.on("message", (topic, message) => {
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch (err) {
    console.error("⚠️ Error al parsear mensaje MQTT:", err.message);
    return;
  }

  if (!data || typeof data !== "object") return;

  if (topic.includes("/oferta")) procesarOferta(data);
  else if (topic.includes("/estado")) procesarEstado(data);
});

// ======================================================
// 📘 ESTADOS DE RECURSOS
// ======================================================
function procesarEstado(data) {
  if (!data.id || !data.estado) return;

  estadoRecursos.set(data.id, data);
  // console.log(`📘 Estado recibido de ${data.id}: ${data.estado}`);

  if (data.estado === "Averiado") {
    iniciarRenegociacion(data.id);
  }
}

// ======================================================
// 🧩 SOLICITAR OFERTAS
// ======================================================
function solicitarOfertas(mision) {
  if (!mision?.id || !mision?.tarea) {
    // console.error("⚠️ Misión inválida al solicitar ofertas.");
    return;
  }

  // console.log(`🧩 Solicitando ofertas para tarea: ${mision.tarea}`);
  ofertasRecibidas = [];

  const sdeO = {
    tipo_msg: "SdeO",
    id_orden: mision.id,
    tarea_requerida: mision.tarea,
    timestamp: Date.now(),
  };

  publicarMQTT(TOPIC_MISION_CONTROL, JSON.stringify(sdeO));
  // console.log(`📤 Publicado en ${TOPIC_MISION_CONTROL}:`, sdeO);
}

// ======================================================
// 💬 PROCESAR OFERTAS
// ======================================================
function procesarOferta(oferta) {
  if (
    !oferta?.id ||
    !oferta?.id_orden ||
    !oferta?.tarea_ofertada ||
    typeof oferta.tiempo_estimado !== "number"
  ) {
    // console.warn("⚠️ Oferta inválida recibida:", oferta);
    return;
  }

  if (
    oferta.id_orden === misionActual.id &&
    oferta.tarea_ofertada === misionActual.tarea
  ) {
    // console.log(`📨 Oferta recibida de ${oferta.id}: tiempo=${oferta.tiempo_estimado}s`);
    ofertasRecibidas.push(oferta);

    // ⚡ Adjudicación inmediata
    adjudicarMejorOferta();
  }
}

// ======================================================
// ⚡ ADJUDICACIÓN INMEDIATA
// ======================================================
function adjudicarMejorOferta() {
  if (ofertasRecibidas.length === 0) return;

  // Elegir la mejor oferta
  const mejor = ofertasRecibidas.reduce((best, curr) =>
    curr.tiempo_estimado < best.tiempo_estimado ? curr : best
  );

  const anuncio = {
    tipo_msg: "AdO",
    timestamp: Date.now(),
    id_orden: mejor.id_orden,
    recurso_asignado: mejor.id,
  };

  publicarMQTT(TOPIC_MISION_CONTROL, JSON.stringify(anuncio));
  // console.log(`🏆 Adjudicación enviada a ${mejor.id}`);

  // Limpiar ofertas tras adjudicar
  ofertasRecibidas = [];
}

// ======================================================
// ♻️ RENEGOCIACIÓN
// ======================================================
function iniciarRenegociacion(recursoId) {
  // console.warn(`♻️ Re-negociación por fallo en ${recursoId}`);
  solicitarOfertas(misionActual);
}

// ======================================================
// 🕹️ ENVÍO DE COMANDO MANUAL
// ======================================================
function enviarComando(tipo, payload = {}) {
  if (!tipo) {
    // console.error("⚠️ Tipo de comando no especificado.");
    return;
  }

  const comando = {
    tipo_msg: tipo,
    timestamp: Date.now(),
    ...payload,
  };

  publicarMQTT(TOPIC_MISION_CONTROL, JSON.stringify(comando));
  // console.log(`📤 Comando enviado: ${tipo}`, payload);
}

// ======================================================
// 📦 EXPORTS
// ======================================================
module.exports = {
  solicitarOfertas,
  procesarOferta,
  adjudicarMejorOferta,
  enviarComando,
};
