
const { procesarPromptIAdc, 
        procesarPromptIO, 
        procesarPromptControl, 
        procesarPromptSupervisor, 
        procesarPromptCaracterizacion, 
        procesarPromptIdentificacion,
        procesarPromptPetri,
        procesarPrompComparacion,
        procesarPromptControlIA
      } = require("../controllers/plcControllerAi");
const { publicarMQTT, suscribirTopics } = require("../mqtt/conectMqtt");
const { ejecutarTarea } = require("../services/holonPlc");

function IA() {
  suscribirTopics(
        ["Plc/Adc",
          "Plc/Ia",
          "Plc/Control",
          "Plc/Supervisor",
          "Plc/Caracterizacion",
          "Plc/Identificacion",
          "Plc/Petri",
          "Plc/Comparacion",
          "Plc/ControlIA",
          "hms/recurso/+/estado",
          "hms/recurso/+/oferta",
          "hms/mision/comando",
        ], async (topic, msg) => {
    
    // console.log(`Mensaje recibido en ${topic}:`, msg);  
    
    try {
      let resultado;
      switch (topic) {
        case "Plc/Adc":
          resultado = await procesarPromptIAdc(msg); break;  
        case "Plc/Ia":
          resultado = await procesarPromptIO(msg); break;
        case "Plc/Control":
          resultado = await procesarPromptControl(msg); break;
        case "Plc/Supervisor":
          resultado = await procesarPromptSupervisor(msg); break;
        case "Plc/Caracterizacion":
          resultado = await procesarPromptCaracterizacion(msg); break;          
        case "Plc/Identificacion":
          resultado = await procesarPromptIdentificacion(msg); break;          
        case "Plc/Petri":
          resultado = await procesarPromptPetri(msg); break;    
        case "Plc/Comparacion":
          // 🛡️ FILTRO ANTI-LOOP: Ignorar mensajes que sean resultados propios (contienen telemetria)
          if (msg.includes("voltaje0") || msg.includes("voltaje1")) {
              // console.log("Ignorando eco de datos en Plc/Comparacion");
              break; 
          }
          resultado = await procesarPrompComparacion(msg); break;    
        case "Plc/ControlIA":
          resultado = await procesarPromptControlIA(msg); break;    
        case /^hms\/recurso\/.+\/estado$/.test(topic):
          await publicarEstado(msg);break;
        case /^hms\/recurso\/.+\/oferta$/.test(topic):
            // console.log("Ejecutando ofertas supervisor...");
            await responderOferta(msg);break;
        case "hms/mision/comando":
          //  console.log("🚀 Ejecutando tarea recibida del supervisor...");
            await ejecutarTarea(msg);break;
        }
      if (resultado) {
        publicarMQTT("Plc/Respuesta", JSON.stringify(resultado));
      }
    } catch (err) {
      console.error(`❌ Error procesando mensaje de ${topic}:`, err.message);
    }
  });
}

module.exports = {IA}; 
