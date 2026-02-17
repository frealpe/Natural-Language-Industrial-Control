// services/holonPLC.js
const { mqttClient, publicarMQTT } = require("../mqtt/conectMqtt");

// ======================================================
// 🤖 CONFIGURACIÓN DEL RECURSO
// ======================================================
const RECURSO_ID = "HR_CNC_01"; // Cambiar según el recurso
const COMPETENCIA = "Pulido";
let estadoActual = "Disponible";
let tareaEnEjecucion = null;
let tareaActual = null; // ⚡ Guardar la tarea que se ejecuta

// ======================================================
// 🔹 TÓPICOS
// ======================================================
const TOPIC_MISION_CONTROL = "hms/mision/comando"; // Supervisor → Recursos
const TOPIC_ESTADO = `hms/recurso/${RECURSO_ID}/estado`; // Estado periódico
const TOPIC_OFERTA = `hms/recurso/${RECURSO_ID}/oferta`; // Ofertas enviadas

// ======================================================
// 🔌 CONEXIÓN AL BROKER MQTT
// ======================================================
mqttClient.on("connect", () => {
  // console.log(`🤖 ${RECURSO_ID} conectado al broker MQTT`);

  mqttClient.subscribe(TOPIC_MISION_CONTROL, { qos: 1 }, (err) => {
    if (err) console.error(`⚠️ Error al suscribirse a ${TOPIC_MISION_CONTROL}:`, err.message);
    else console.log(`📡 Suscrito a ${TOPIC_MISION_CONTROL}`);
  });

  publicarEstado();
});

// ======================================================
// 📨 RECEPCIÓN DE MENSAJES
// ======================================================
mqttClient.on("message", (topic, message) => {
  if (topic !== TOPIC_MISION_CONTROL) return;
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch (err) {
    // console.error("⚠️ Error al parsear mensaje MQTT:", err.message);
    return;
  }

  if (!data?.tipo_msg) return;

  switch (data.tipo_msg) {
    case "SdeO":
      if (data.tarea_requerida?.trim().toLowerCase() === COMPETENCIA.trim().toLowerCase()) {
        // console.log(`📨 ${RECURSO_ID} recibió SdeO: ${data.id_orden}`);
        responderOferta(data);
      } else {
        // console.log(`⚙️ ${RECURSO_ID} ignoró SdeO (tarea '${data.tarea_requerida}' ≠ competencia '${COMPETENCIA}')`);
      }
      break;

    case "AdO":
      if (data.recurso_asignado === RECURSO_ID) {
        tareaActual = data.tarea_requerida || COMPETENCIA; // ⚡ Guardamos la tarea real
        // console.log(`✅ ${RECURSO_ID} adjudicado para ${data.id_orden} - Tarea: ${tareaActual}`);
        ejecutarTarea(data);
      }
      break;

    default:
      // Ignora mensajes no relevantes
      break;
  }
});

// ======================================================
// 📡 PUBLICAR ESTADO
// ======================================================
function publicarEstado() {
  const payload = {
    id: RECURSO_ID,
    estado: estadoActual,
    competencia: COMPETENCIA,
    carga: Math.floor(Math.random() * 50) + 10,
    timestamp: Date.now(),
  };

  try {
    publicarMQTT(TOPIC_ESTADO, JSON.stringify(payload));
    if (estadoActual !== "Disponible") {
      // console.log(`📤 Estado publicado: ${RECURSO_ID} -> ${estadoActual}`);
    }
  } catch (err) {
    // console.error("⚠️ Error publicando estado:", err.message);
  }
}

// ======================================================
// 💬 RESPONDER A SOLICITUD DE OFERTA
// ======================================================
function responderOferta(sdeO) {
  if (estadoActual !== "Disponible") {
    // console.log(`🚫 ${RECURSO_ID} no puede ofertar (estado: ${estadoActual})`);
    return;
  }

  estadoActual = "Ofertando";
  publicarEstado();

  const oferta = {
    tipo_msg: "Oferta",
    timestamp: Date.now(),
    id: RECURSO_ID,
    id_orden: sdeO.id_orden,
    tarea_ofertada: COMPETENCIA,
    tiempo_estimado: Math.floor(Math.random() * 8) + 3, // 3–10 segundos
  };

  // console.log(`📨 ${RECURSO_ID} enviando oferta: ${oferta.tiempo_estimado}s`);
  publicarMQTT(TOPIC_OFERTA, JSON.stringify(oferta));

  // Volver a "Disponible" después de breve pausa
  setTimeout(() => {
    if (estadoActual === "Ofertando") {
      estadoActual = "Disponible";
      publicarEstado();
    }
  }, 4000);
}

// ======================================================
// 🔧 EJECUTAR TAREA ADJUDICADA
// ======================================================
function ejecutarTarea(adO) {
  if (estadoActual === "Ocupado" || tareaEnEjecucion) {
    // console.warn(`⚠️ ${RECURSO_ID} ya está ocupado, ignorando nueva tarea.`);
    return;
  }

  estadoActual = "Ocupado";
  tareaEnEjecucion = adO.id_orden;

  // ⚡ Aquí asignamos correctamente la tarea a ejecutar
  tareaActual = adO.tarea_requerida || COMPETENCIA;

  publicarEstado();

  const duracion = Math.floor(Math.random() * 8) + 3; // 3–10 segundos
  // console.log(`🔧 ${RECURSO_ID} ejecutando ${tareaActual} (${duracion}s)...`);

  setTimeout(() => {
    if (Math.random() < 0.1) {
      estadoActual = "Averiado";
      // console.log(`🚨 ${RECURSO_ID} falló durante ${tareaActual}`);
    } else {
      estadoActual = "Disponible";
      // console.log(`✅ ${RECURSO_ID} completó ${tareaActual}`);
    }

    publicarEstado();
    tareaEnEjecucion = null;
    tareaActual = null; // Limpiamos al final
  }, duracion * 1000);
}

// ======================================================
// 🔁 PUBLICAR ESTADO CADA 5 SEGUNDOS
// ======================================================
setInterval(publicarEstado, 5000);

// ======================================================
// 📦 EXPORTS
// ======================================================
module.exports = { publicarEstado, responderOferta, ejecutarTarea };
