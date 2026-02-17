// services/HolonSupervisor.js
const { mqttClient, publicarMQTT } = require("../mqtt/conectMqtt");

// 🔹 Tópicos
const TOPIC_MISION_CONTROL = "hms/mision/comando"; 
const TOPIC_OFERTAS = "hms/recurso/+/oferta";
const TOPIC_ESTADOS = "hms/recurso/+/estado";

// 🔹 Estados internos
let estadoRecursos = new Map();
let ofertasRecibidas = [];
let adjudicacionPendiente = false;

let misionActual = {
  id: "MIS-TEST",
  tarea: "Pulido",
};

class HolonSupervisor {
  constructor() {
    this.inicializarMQTT();
  }

  inicializarMQTT() {
    mqttClient.on("connect", () => {
      // console.log("🔗 Supervisor conectado al broker MQTT");

      // Suscribirse a ofertas y estados
      [TOPIC_OFERTAS, TOPIC_ESTADOS].forEach((topic) => {
        mqttClient.subscribe(topic, { qos: 1 }, (err) => {
          if (err) console.error(`⚠️ Error al suscribirse a ${topic}:`, err.message);
        });
      });

      // Enviar primera misión después de breve delay para asegurar suscripción
      setTimeout(() => {
        // console.log("🤖 Enviando primera SdeO y solicitando ofertas...");
        this.enviarComando("SdeO", { id_orden: misionActual.id, tarea_requerida: misionActual.tarea });
        this.solicitarOfertas();
      }, 500);

      // Ciclo continuo de solicitudes cada 15s
      setInterval(() => this.solicitarOfertas(), 15000);
    });

    mqttClient.on("message", (topic, message) => {
    // console.log(`📡 Mensaje MQTT recibido en ${topic}:`, message.toString());
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        return console.error("⚠️ Error al parsear mensaje MQTT");
      }

      if (!data) return;

      if (topic.includes("/oferta")) this.procesarOferta(data);
      else if (topic.includes("/estado")) this.procesarEstado(data);
    });
  }

  procesarEstado(data) {
    if (!data.id || !data.estado) return;
    estadoRecursos.set(data.id, data);
    // console.log(`📘 Estado recibido de ${data.id}: ${data.estado}`);

    if (data.estado === "Averiado") this.iniciarRenegociacion(data.id);
  }

  procesarOferta(oferta) {
    if (!oferta?.id || !oferta?.id_orden) return;

    if (oferta.id_orden === misionActual.id) {
      // Guardar oferta solo si no existe
      if (!ofertasRecibidas.find(o => o.id === oferta.id)) {
        ofertasRecibidas.push(oferta);
        // console.log(`📨 Oferta recibida de ${oferta.id}: tiempo=${oferta.tiempo_estimado}s`);
      }

      // Adjudicar automáticamente si aún no se ha hecho
      if (!adjudicacionPendiente) {
        adjudicacionPendiente = true;
        setTimeout(() => this.evaluarOfertas(), 1000);
      }
    }
  }

  solicitarOfertas() {
    // console.log(`🧩 Solicitando ofertas para tarea: ${misionActual.tarea}`);

    const sdeO = {
      tipo_msg: "SdeO",
      id_orden: misionActual.id,
      tarea_requerida: misionActual.tarea,
      timestamp: Date.now(),
    };

    publicarMQTT(TOPIC_MISION_CONTROL, JSON.stringify(sdeO));
    // console.log(`📤 Publicado en ${TOPIC_MISION_CONTROL}:`, sdeO);

    // Garantiza adjudicación máxima a los 5s
    setTimeout(() => {
      if (!adjudicacionPendiente) {
        adjudicacionPendiente = true;
        this.evaluarOfertas();
      }
    }, 5000);
  }

  evaluarOfertas() {
    const ofertasValidas = ofertasRecibidas.filter((of) => of.id_orden === misionActual.id);

    if (ofertasValidas.length === 0) {
      // console.warn("❌ No se recibieron ofertas para la misión:", misionActual.id);
      adjudicacionPendiente = false;
      return;
    }

    const mejor = ofertasValidas.reduce((best, curr) =>
      curr.tiempo_estimado < best.tiempo_estimado ? curr : best
    );

    // console.log(`🏆 Oferta ganadora: ${mejor.id} (${mejor.tiempo_estimado}s)`);

    const anuncio = {
      tipo_msg: "AdO",
      timestamp: Date.now(),
      id_orden: mejor.id_orden,
      recurso_asignado: mejor.id,
    };

    publicarMQTT(TOPIC_MISION_CONTROL, JSON.stringify(anuncio));
    // console.log(`📤 Adjudicación enviada a ${mejor.id}`);

    // Limpiar para siguiente misión
    adjudicacionPendiente = false;
    ofertasRecibidas = [];
  }

  iniciarRenegociacion(recursoId) {
    // console.warn(`♻️ Re-negociación por fallo en ${recursoId}`);
    this.solicitarOfertas();
  }

  enviarComando(tipo, payload = {}) {
    const comando = { tipo_msg: tipo, timestamp: Date.now(), ...payload };
    publicarMQTT(TOPIC_MISION_CONTROL, JSON.stringify(comando));
    // console.log(`📤 Comando enviado: ${tipo}`, payload);
  }
}

module.exports = HolonSupervisor;
