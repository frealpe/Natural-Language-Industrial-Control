const pool = require("../database/config");
const Sockets = require("../lib/socket");
const {
  datalogger,
  guardarCaracterizacion,
  guardarComparacion
} = require("../services/datalogger");
const { generarComandoPLC } = require("../services/gtpServices");
const {
  gtpServicesCaracterizacion,
} = require("../services/gtpServicesCaracterizacion");
const { gtpServicesCompara } = require("../services/gtpServicesCompara");
// const { gtpServicesControlIA } = require("../services/gtpServicesControlIA");
const {
  identificarModeloIA,
} = require("../services/gtpServicesIndentificacion");
const { gtpServicesPetri } = require("../services/gtpServicesPetri");
const { identificarModeloAutomatico } = require("../services/identificarModeloAutomatico");
// const {ejecutarControlIA } = require("../services/ControlIA");
const { coeficientes } = require("../services/modelo");
// const {
//   escribirSalida,
//   leerEntrada,
//   ejecutarADC,
//   ejecutarControlPI, 
//   Caracterizacion,
//   Identificacion,
//   ejecutarComparacion,
// } = require("../services/plcServicesSimulado");


const {
  escribirSalida,
  leerEntrada,
  ejecutarADC,
  ejecutarControlPI, 
  Caracterizacion,
  Identificacion,
  ejecutarComparacion,
} = require("../services/plcServices");

const procesarPromptIO = async (prompt) => {
  try {
    if (!prompt) return { ok: false, msg: "El campo 'prompt' es obligatorio" };

    const comando = await generarComandoPLC(prompt);
    if (!comando || !comando.accion) {
      return { ok: false, msg: "Comando inválido generado" };
    }

    console.log("GPT Router Acción:", comando.accion);

    let resultado = null;

    switch (comando.accion) {
      case "salida":
        resultado = await escribirSalida({
          pin: comando.pin,
          valor: comando.estado,
        });
        break;

      case "entrada":
        resultado = await leerEntrada(comando.pin);
        break;

      case "adc":
         resultado = await ejecutarADC({
            canal: comando.canal,
            muestreo: comando.intervalo_ms,
            duracion: comando.duracion_ms,
          });
        break;

      case "control":
        return await procesarPromptControl(prompt);

      case "caracterizacion":
         return await procesarPromptCaracterizacion(prompt);
      
      case "identificacion":
         return await procesarPromptIdentificacion(comando);

      case "comparacion":
         return await procesarPrompComparacion(prompt);

      case "prueba":
      case "evaluacion":
         return await procesarPromptPrueba(prompt);


      default:
        return { ok: false, msg: `Acción desconocida (Router): ${comando.accion}` };
    }

    return { ok: true, resultado };
  } catch (error) {
    return {
      ok: false,
      msg: "Error al procesar la consulta con GPT",
      error: error.message,
    };
  }
};

const procesarPromptIAdc = async (prompt) => {
  try {
    if (!prompt) return { ok: false, msg: "El campo 'prompt' es obligatorio" };

    const comando = await generarComandoPLC(prompt);
    if (!comando || !comando.accion) {
      return { ok: false, msg: "Comando inválido generado" };
    }

    let resultado = null;

    if (comando.accion === "adc") {
      resultado = await ejecutarADC({
        canal: comando.canal,
        muestreo: comando.intervalo_ms,
        duracion: comando.duracion_ms,
      });
    }

    return { resultado };
  } catch (error) {
    return {
      ok: false,
      msg: "Error al procesar la consulta con GPT",
      error: error.message,
    };
  }
};

const procesarPromptControl = async (prompt) => {
  try {
    if (!prompt) return { ok: false, msg: "El campo 'prompt' es obligatorio" };

    const comando = await generarComandoPLC(prompt);
    if (!comando || !comando.accion) {
      return { ok: false, msg: "Comando inválido generado" };
    }

    let resultados = null;

    if (comando.accion === "control") {
      const { resultados: res, Prueba } = await ejecutarControlPI({
        canalAdc: comando.canalAdc,
        canalPwm: comando.canalPwm,
        setpoint_volt: comando.setpoint_volt,
        tiempo_muestreo_ms: comando.tiempo_muestreo_ms,
        tiempo_simulacion_ms: comando.tiempo_simulacion_ms,
      });

      resultados = res;
      datalogger({ resultados, Prueba });
    }

    return { ok: true, resultados };
  } catch (error) {
    return {
      ok: false,
      msg: "Error al procesar el control con GPT",
      error: error.message,
    };
  }
};

const procesarPromptSupervisor = async (prompt) => {
  try {
    if (!prompt) return { ok: false, msg: "El campo 'prompt' es obligatorio" };
    return { ok: true, comando: "Informe generando" };
  } catch (error) {
    return {
      ok: false,
      msg: "Error al procesar el supervisor con GPT",
      error: error.message,
    };
  }
};

const procesarPromptCaracterizacion = async (prompt) => { 
  try {
    if (!prompt) return { ok: false, msg: "El campo 'prompt' es obligatorio" };

    console.log("Comando caracterización generado:", prompt);

    // 1. Obtener parámetros de GPT (Rápido)
    const comando = await gtpServicesCaracterizacion(prompt);
    console.log("Comando caracterización procesado:", comando);

    // 2. Ejecutar proceso en segundo plano (FIRE AND FORGET)
    ejecutarYGuardarCaracterizacion(comando).catch(err => 
        console.error("❌ Error en caracterización background:", err)
    );

    // 3. Responder inmediatamente al usuario
    return {
      ok: true,
      msg: "Caracterización iniciada en segundo plano. Los datos llegarán por MQTT.",
      parametros: comando
    };
  } catch (error) {
    return {
      ok: false,
      msg: "Error al procesar la caracterización con GPT",
      error: error.message,
    };
  }
};

// Función auxiliar para proceso asíncrono
const ejecutarYGuardarCaracterizacion = async (comando) => {
    try {
        console.log("🚀 Iniciando background task: Caracterizacion");
        const { resultado, Prueba } = await Caracterizacion({ params: comando });
        const registro = await guardarCaracterizacion({ resultado, Prueba });
        console.log("✅ Caracterización finalizada y guardada. ID:", registro?.id);
    } catch (error) {
        console.error("❌ Error ejecutando/guardando caracterización:", error);
    }
};

const procesarPromptIdentificacion = async (prompt) => {
  console.log("🚀 [v3] procesarPromptIdentificacion call. PromptType:", typeof prompt);
  let client;

  try {
    client = await pool.connect();

    let datosPrompt;
    try {
      datosPrompt = typeof prompt === "string"
        ? JSON.parse(prompt)
        : prompt;
    } catch {
      return { ok: false, tipo: "Identificacion", error: "JSON inválido." };
    }

    const { consulta } = datosPrompt;

    if (!consulta) {
      return {
        ok: false,
        tipo: "Identificacion",
        error: "No hay consulta SQL."
      };
    }

    console.log("📡 Consulta SQL para identificación:", consulta);

    const resQuery = await client.query(consulta);

    if (resQuery.rowCount === 0) {
      return {
        ok: false,
        tipo: "Identificacion",
        error: "No se encontraron registros."
      };
    }

    const registro = resQuery.rows[0];
    const data = registro.resultado;

    if (!Array.isArray(data) || data.length < 10) {
      return {
        ok: false,
        tipo: "Identificacion",
        error: "'resultado' no es un array válido o insuficiente."
      };
    }

    // ============================================================
    // 🔥 IDENTIFICACIÓN AUTOMÁTICA REAL
    // ============================================================
    
    // 🧠 Lógica inteligente movida AQUÍ a petición del usuario
    // Si el prompt original era texto y no traía 'usarIA' explícito, analizamos con GPT
    // para ver si la intención era usar IA.
    
    console.log("🔍 [DEBUG PLC Controller] Datos Prompt Identificación:", JSON.stringify(datosPrompt));

    // Restore: Respetar el flag del usuario si existe
    let solicitudIA = datosPrompt.usarIA; 
    let ordenIA = datosPrompt.orden || null;

    // Si NO viene explícito y el prompt original era texto... preguntamos al Oráculo (GPT)
    if (typeof datosPrompt.usarIA === 'undefined' && typeof prompt === 'string') {
        try {
             console.log("🧠 [Identificacion] Analizando intención implícita en texto...");
             // Importar generarComandoPLC si es necesario o asumir que está en scope (estaba en scope antes)
             const { generarComandoPLC } = require('../services/gtpServicesControlIA');
             const comandoAnalisis = await generarComandoPLC(prompt);
             
             if (comandoAnalisis?.accion === 'identificacion') {
                 solicitudIA = comandoAnalisis.usarIA === true;
                 if (comandoAnalisis.orden) ordenIA = comandoAnalisis.orden;
                 console.log("⚡ GPT detectó intención de Identificación IA:", solicitudIA);
             } else {
                 solicitudIA = /IA/i.test(prompt); // Fallback
             }
        } catch (e) {
             console.log("⚠️ Fallo análisis GPT en Identificación, usando regex backup");
             solicitudIA = /IA/i.test(prompt);
        }
    }

    // Flag definitivo
    const usarIA = !!solicitudIA;
    
    console.log("🧐 [v3] Flag usarIA final en Identificación:", usarIA);

    const resultado = await identificarModeloAutomatico({
      data,
      conversacion: "Identificación automática desde base de datos",
      ordenMax: 3,
      fitMinimo: 90,
      fitMinimo: 90,
      usarIA: !!usarIA,
      orden: ordenIA
    });

    if (!resultado.ok) {
      return {
        ok: false,
        tipo: "Identificacion",
        error: "No se pudo identificar un modelo válido."
      };
    }

    const {
      ordenSeleccionado,
      coeficientes,
      Ts,
      ecuacion,
      metodo
    } = resultado;

    console.log(
      `✅ Modelo ARX(${ordenSeleccionado}) seleccionado [${metodo}] | MSE = ${resultado.mse?.toExponential(3)}`
    );

    // ============================================================
    // 🔁 ENVÍO A ETAPA POSTERIOR (stream / simulación / control)
    // ============================================================
    await Identificacion({ Ts, data });

    return {
      ok: true,
      tipo: "Identificacion",
      orden: ordenSeleccionado,
      coeficientes,
      Ts,
      mse: resultado.mse,
      mse: resultado.mse,
      ecuacion,
      metodo,
      analisisIA: resultado.analisisIA
    };

  } catch (error) {
    console.error("❌ Error en procesarPromptIdentificacion:", error);

    return {
      ok: false,
      tipo: "Identificacion",
      error: error.message || "Error interno."
    };

  } finally {
    if (client) client.release();
  }
};


const procesarPrompComparacion = async (prompt) => {
  try {

    // 🛡️ BYPASS GPT: Si el prompt ya es un JSON de comando válido, úsalo directo.
    let comando;
    try {
        const json = typeof prompt === 'string' ? JSON.parse(prompt) : prompt;
        if (json && json.accion === 'comparacion' && Array.isArray(json.secuencia)) {
            // console.log("⏩ Bypass GPT: Usando comando JSON directo");
            comando = json;
        }
    } catch (e) {
        // No es JSON válido, continuar con GPT normal
    }

    if (!comando) {
        comando = await gtpServicesCompara(prompt);
    }

    if (comando.accion !== 'comparacion') {
         return { ok: false, msg: `Se detectó acción '${comando.accion}' pero se esperaba 'comparacion'. Use el topic correcto.`};
    }

    // 🛡️ NORMALIZACIÓN DE SECUENCIA (Defensa en profundidad)
    if (Array.isArray(comando.secuencia)) {
        comando.secuencia = comando.secuencia.map(paso => {
            // Unificar todo a 'porcentaje'
            const val = paso.porcentaje ?? paso.valor ?? paso.capacidad ?? 0;
            return {
                ...paso, // Mantener duracion_s y otros
                porcentaje: val
            };
        });
        console.log("🔍 [plcControllerAi] Secuencia normalizada:", JSON.stringify(comando.secuencia));
    }

    // ⚡ EJECUCIÓN EN SEGUNDO PLANO (FIRE AND FORGET)
    // No esperamos a que termine para responder al cliente, evitando timeouts y reintentos.
    ejecutarYGuardarComparacion(comando).catch(err => 
        console.error("❌ Error en comparación background:", err)
    );

    return {
      ok: true,
      msg: "Comparación iniciada en segundo plano. Los datos llegarán por MQTT.",
    };
  } catch (error) {
    return {
      ok: false,
      msg: "Error al iniciar la comparación",
      error: error.message,
    };
  }
};

// Función auxiliar para proceso asíncrono
const ejecutarYGuardarComparacion = async (comando) => {
    try {
        const { resultados, Prueba } = await ejecutarComparacion({...comando });
        const registro = await guardarComparacion({ resultados, Prueba });
        console.log("✅ Comparación finalizada y guardada. ID:", registro?.id);
    } catch (error) {
        console.error("❌ Error ejecutando/guardando comparación:", error);
    }
};

const procesarPromptPetri = async (prompt) => {
  try {

    console.log("Comando Petri:", prompt);
    const comando = await gtpServicesPetri(prompt);
    console.log("Comando Petri procesado:", comando);

    return {
      ok: true,
      msg: "Evaluación de red de Petri procesada correctamente",
      registro,
    };
  } catch (error) {
    return {
      ok: false,
      msg: "Error al procesar la caracterización con GPT",
      error: error.message,
    };
  }
};

const procesarPromptControlIA = async (prompt) => {
  console.log("🚀 [v3] procesarPromptControlIA call. Prompt:", prompt);
  try {
    if (!prompt) return { ok: false, msg: "El campo 'prompt' es obligatorio" };

    const promptInicial = prompt;

    await procesarPromptCaracterizacion(prompt="caracteriza la planta");
    
     Sockets.enviarMensaje('resetPlc',1);

    // console.log("Terminada la Caracterizacion:");

    // 🧠 COORDINACIÓN DE PROCESOS
    // El controlador 'ControlIA' orquesta Caracterización -> Identificación -> Control
    // Delegamos la lógica específica a cada módulo.

    // 1. Detectar si el usuario pide IA (Texto u Objeto)
    let usarIA = false;
    let orden = 1;

    if (typeof promptInicial === 'object' && promptInicial !== null) {
         usarIA = !!promptInicial.usarIA;
         orden = promptInicial.orden || 1;
    } else {
         // Si es texto, hacemos un chequeo rápido para activar la bandera.
         // La "inteligencia" profunda de cómo identificar está en el módulo de identificación.
         usarIA = /IA/i.test(String(promptInicial));
    }
    
    console.log("🔍 [ControlIA] Coordinando secuencia. Modo IA:", usarIA);

    const offset = (typeof promptInicial === 'object' && promptInicial.offset) ? parseInt(promptInicial.offset) : 0;

    const pruebaidentificacion = {
          consulta: `SELECT * FROM caracterizacion ORDER BY id ASC OFFSET ${offset} LIMIT 1;`,
          orden: orden,
          usarIA: usarIA
    };
    
    // Si el prompt original traía consulta personalizada, la respetamos
    if (promptInicial?.consulta) {
        pruebaidentificacion.consulta = promptInicial.consulta;
    }

    const promptIdentificacion = pruebaidentificacion;
    
    // console.log("Terminada la Identificación:");

     // Capture results
     const identResult = await procesarPromptIdentificacion(promptIdentificacion);
     Sockets.enviarMensaje('resetPlc', { valor:1 });
     
     console.log("Prompt Usuario", promptInicial);
     
     // Use identified coefficients if available, else fallback
     const coefplanta = identResult.coeficientes || coeficientes;
     // console.log("Coeficientes de la planta identificada:", coefplanta);
     
     const Ts = 0.05; //           Ts=0.05;
         // ✅ Llamada correcta al servicio con parámetros reales (Dinámica para recargar lógica)
          const servicePath = require.resolve("../services/gtpServicesControlIA");
          delete require.cache[servicePath];
          const { gtpServicesControlIA } = require(servicePath);

          const { ok, parametrosControl} = await gtpServicesControlIA({
            coeficientes: coefplanta,
            Ts: Ts,
            promptUsuario:promptInicial
          });

   if (ok) {
      console.log("📦 Parámetros de control generados:", parametrosControl);

      // 🟢 Carga dinámica esencial: Invalidar caché para cargar el archivo recién generado
      try {
          const modulePath = require.resolve("../services/ControlIA");
          delete require.cache[modulePath]; // 🗑️ Borrar caché anterior
          const { ejecutarControlIA } = require(modulePath); // 🔄 Cargar nueva versión

          console.log("🚀 Ejecutando Control IA generado...");
          const { resultados, Prueba } = await ejecutarControlIA(parametrosControl);
          datalogger({ resultados, Prueba });
      } catch (err) {
          console.error("❌ Error cargando/ejecutando ControlIA gen:", err);
      }
   }
      
  } catch (error) {
    return {

    };
  }
};




const procesarPromptPrueba = async (prompt) => {
    console.log("🚀 [v3] procesarPromptPrueba call. Prompt:", prompt);
    try {
        if (!prompt) return { ok: false, msg: "El campo 'prompt' es obligatorio" };

        const promptInicial = prompt;
        
        // 1. Obtener parámetros de planta (Podemos re-identificar o usar caché, 
        // aquí asumo caché para 'prueba' rápida o re-identificación implícita si fuera necesaria,
        // pero por simplicidad usaremos los coeficientes globales por defecto o cargados.
        // Si se desea robustez, se debería llamar a identificación igual que ControlIA)
        
        // Opción: Usar los últimos coeficientes conocidos o defaults
        const { coeficientes: coefDefault } = require("../services/modelo");
        
        // Parametros simulación
        const Ts = 0.05;

        // ✅ Llamada al servicio con isTestMode = TRUE
        const servicePath = require.resolve("../services/gtpServicesControlIA");
        delete require.cache[servicePath];
        const { gtpServicesControlIA } = require(servicePath);

        const { ok, parametrosControl } = await gtpServicesControlIA({
            coeficientes: coefDefault, // Usamos coefs actuales
            Ts: Ts,
            promptUsuario: promptInicial,
            isTestMode: true // 🚨 ACTIVAR MODO PRUEBA / PERTURBACIÓN
        });

        if (ok) {
            console.log("📦 Parámetros de PRUEBA generados:", parametrosControl);

            // 🟢 Carga dinámica y ejecución
            try {
                const modulePath = require.resolve("../services/ControlIA");
                delete require.cache[modulePath]; 
                const { ejecutarControlIA } = require(modulePath);

                console.log("🚀 Ejecutando PRUEBA (Control + Perturbación)...");
                const { resultados, Prueba } = await ejecutarControlIA(parametrosControl);
                datalogger({ resultados, Prueba });
                
                return { ok: true, msg: "Prueba de perturbación finalizada", resultados };
            } catch (err) {
                console.error("❌ Error cargando/ejecutando ControlIA (Prueba):", err);
                return { ok: false, error: err.message };
            }
        } else {
             return { ok: false, msg: "Error generando parámetros de prueba" };
        }

    } catch (error) {
        console.error("❌ Error en procesarPromptPrueba:", error);
        return { ok: false, error: error.message };
    }
};

module.exports = {
  procesarPromptIO,
  procesarPromptIAdc,
  procesarPromptControl,
  procesarPromptSupervisor,
  procesarPromptCaracterizacion,
  procesarPromptIdentificacion,
  procesarPromptPetri,
  procesarPrompComparacion,
  procesarPromptControlIA,
  procesarPromptPrueba
};

