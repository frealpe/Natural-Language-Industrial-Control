const OpenAI = require("openai");
const { config } = require("dotenv");
config();

// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Historial conversacional global (máx. 10 mensajes)
let historialConversacion = [];

// ==========================================
// 2. PATRONES REGUALRES (REGEX)
// ==========================================
const PATTERNS = {
  // Detecta solicitud de Controlador IA o Plnata de segundo orden
  CONTROL_IA: /\b(implementa\s+un\s+controlador\s+ia|controlador\s+ia|planta\s+de\s+segundo\s+orden)\b/i,
  // Detecta paramaetros como Zita
  ZITA: /\b(zita|ζ|coeficiente\s+de\s+amortiguamiento\s+relativo)\s*=?\s*[\d.]+\b/i,
  // Detecta intención de Identificación de Planta
  IDENTIFICACION: /\b(identifica|identificación|identificando|modelo\s*de\s*la\s*planta|identificar|determina\s*modelo)\b/i,
  // Detecta Redes de Petri
  PETRI: /\b(petri|red\s*de\s*petri|transiciones|plaza|token|simulación\s*petri)\b/i,
  // Detecta Comparación de Modelos (incluye typos comunes)
  COMPARACION: /\b(compara|comparar|comparación|comparacion|comparcion|comparacion|valida|validar|vs|versus)\b/i,
  // Detecta Consultas SQL (Select, ver, listar, etc)
  SQL_KEYWORDS: /\b(select|from|where|consulta|consultar|promedio|filtra|voltaje|error|tiempo|jsonb|datalogger|base\s*de\s*datos|conteo|cuenta|cuántas|cuantos|total|registros|prueba|pruebas|última|ultima|reciente|muestra|dame|ver|listar|enséñame|muéstrame)\b/i,
  // Detecta Comandos PLC (Control, simulación, etc)
  PLC_KEYWORDS: /\b(control|controla|planta|simulacion|simulación|set\s*point|muestreo|adc|canal|salida|q\d?|ejecuta|realiza|lleva|inicia|empieza|arranca|haz|corre|realizar)\b/i,
   // Excepciones para caracterización (si pide ver/dame es SQL, si pide ejecutar es PLC)
  CARACTERIZACION: /caracterizacion|caracterización|excita|excitar|/i,
  SQL_VERBS: /\b(dame|muestra|ver|listar|enséñame|última|ultima|reciente)\b/i,
  PLC_VERBS: /\b(ejecuta|realiza|lleva|inicia|empieza|arranca|haz|corre|realizar)\b/i,
  // Detecta uso de IA explícito
  USO_IA: /\b(ia|inteligencia|gpt|avanzado)\b/i,
};

/**
 * 🧠 gtpServiceUniversal
 * ----------------------------------------------------
 * Servicio principal para la interpretación de lenguaje natural.
 * Determina la intención del usuario y genera respuestas estructuradas
 * para SQL (Base de Datos) o PLC (Control y Automatización).
 * 
 * @param {Object} prompt - Objeto con la propiedad 'text' (instrucción del usuario).
 */
const gtpServiceUniversal = async (prompt) => {
  try {
    // ==========================================
    // PASO 1: VALIDACIÓN DE ENTRAA
    // ==========================================
    if (!prompt || typeof prompt.text !== "string") {
      return {
        tipo: "Error",
        conversacion: "El campo 'text' debe ser una cadena de texto válida.",
        resultado: [{ topic: "Plc/Error", mensaje: "" }],
      };
    }

    const promptLower = prompt.text.toLowerCase();
    
    // ==========================================
    // PASO 2: DETECCIÓN DE INTENCIÓN (REGEX)
    // ==========================================
    const esControlIA = PATTERNS.CONTROL_IA.test(promptLower) || PATTERNS.ZITA.test(promptLower);
    const esIdentificacion = PATTERNS.IDENTIFICACION.test(promptLower);
    const esPetri = PATTERNS.PETRI.test(promptLower);
    const esComparacion = PATTERNS.COMPARACION.test(promptLower);

    // ==========================================
    // PASO 3: EJECUCIÓN RÁPIDA (FAST PATH)
    // ==========================================
    
    // CASO A: CONTROLADOR IA
    if (esControlIA) {
      return {
        tipo: "Plc",
        conversacion: "Se detectó instrucción para implementar un controlador IA para la planta. Se generará ControlIA con los parámetros indicados.",
        resultado: [{
            topic: "Plc/ControlIA",
            mensaje: prompt.text, 
        }],
      };
    }

    // CASO B: REDES DE PETRI
    if (esPetri) {
      return {
        tipo: "Plc",
        conversacion: "Se detectó una instrucción relacionada con redes de Petri. Enviando payload al PLC.",
        resultado: [{
            topic: "Plc/Petri",
            mensaje: "Ejecución y análisis de red de Petri solicitado.",
            red: prompt.file || null,
        }],
      };
    }

    // CASO C: COMPARACIÓN DE MODELOS
    if (esComparacion) {
        return {
          tipo: "Plc",
          conversacion: "Se detectó una solicitud de comparación. Transfiriendo al agente especializado del PLC para análisis detallado.",
          resultado: [{
              topic: "Plc/Comparacion",
              mensaje: prompt.text,
            }],
        };
    }

    // DETERMINAR MODO: SQL vs PLC (para el resto de casos)
    const esSQL = (() => {
        if (esIdentificacion) return true; // Identificación usa SQL para buscar datos base

        const tieneSqlKw = PATTERNS.SQL_KEYWORDS.test(promptLower);
        const tienePlcKw = PATTERNS.PLC_KEYWORDS.test(promptLower);
        
        // REGLA: Si dice "base de datos", forzamos SQL aunque diga "planta"
        if (promptLower.includes("base de datos") || promptLower.includes("base de dato")) return true;

        // Lógica específica para "caracterización"
        if (PATTERNS.CARACTERIZACION.test(promptLower)) {
            if (PATTERNS.SQL_VERBS.test(promptLower)) return true;
            if (PATTERNS.PLC_VERBS.test(promptLower)) return false;
        }

        return tieneSqlKw && !tienePlcKw;
    })();

    // ==========================================
    // PASO 4: CONSTRUCCIÓN DEL SYSTEM PROMPT
    // ==========================================
    const systemPrompt = `
{
  "modo": "inteligente",
  "descripcion": "El asistente actúa como experto dual en SQL para PostgreSQL o traductor técnico PLC, según el contexto del prompt.",
  "reglas_generales": [
    "Devuelve SIEMPRE un JSON válido y limpio, sin texto adicional.",
    "Si el prompt menciona SELECT, tabla, caracterización, datalogger, consulta o SQL, activa el modo SQL.",
    "Si menciona control, simulación, canal, ADC, salida o modelo, activa el modo PLC.",
    "El campo 'conversacion' debe ser claro, técnico y amable."
  ],
  "modo_SQL": {
    "estructura_salida": {
      "conversacion": "<explicación técnica y amable>",
      "resultado": [
        { "sql": "<consulta SQL ejecutable>", "prueba": "<nombre de tabla: caracterizacion o datalogger>" }
      ]
    },
    "reglas": [
      "Tabla 'caracterizacion': id, prueba, resultado (jsonb con 'tiempo', 'voltaje', 'pwm').",
      "Tabla 'datalogger': id, prueba, resultado (jsonb con 'tiempo', 'Voltaje', 'error').",
      "Para conteos: COUNT(prueba).",
      "Para valores JSON: jsonb_array_elements(resultado).",
      "Última medición: SELECT * FROM datalogger ORDER BY prueba DESC LIMIT 1;",
      "Última caracterización: SELECT * FROM caracterizacion ORDER BY prueba DESC LIMIT 1;",
      "Si pide identificar la planta, usa la tabla caracterizacion y toma la última prueba si no especifica id."
    ]
  },
  "modo_PLC": {
    "estructura_salida": {
      "conversacion": "<explicación amable y clara>",
      "resultado": [
        { "topic": "<tema MQTT>", "mensaje": "<instrucción o payload>" }
      ]
    },
    "reglas": [
      "Si contiene 'canal', 'adc' o 'lee', usa topic = 'Plc/Adc'.",
      "Si contiene 'salida' o 'Q', usa topic = 'Plc/Ia'.",
      "Si contiene 'control', 'planta' o 'simulación', usa topic = 'Plc/Control'",
      "Si contiene 'informe' o 'reporte', usa topic = 'Plc/Supervisor'.",
      "Si contiene 'caracterizacion', usa topic = 'Plc/Caracterizacion'.",
      "Si contiene 'identifica' o 'modelo', usa topic = 'Plc/Identificacion'.",
      "Si contiene 'compara', 'lleva' o 'secuencia', usa topic = 'Plc/Comparacion'.",
      "Si no se reconoce el tipo, usa topic = 'Plc/Otros'."
    ]
  }
}
`;

    // Historial para contexto
    const mensajes = [
      { role: "system", content: systemPrompt },
      ...historialConversacion,
      { role: "user", content: prompt.text },
    ];

    // ==========================================
    // PASO 5: LLAMADA A LA IA (OPENAI)
    // ==========================================
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: mensajes,
      temperature: 0.3,
      max_tokens: 200,
    });

    // ==========================================
    // PASO 6: PARSEO Y LIMPIEZA DE RESPUESTA
    // ==========================================
    let content = completion.choices[0]?.message?.content?.trim() || "";
    
    // Limpieza de bloques Markdown (```json ... ```)
    if (content.startsWith("```")) content = content.replace(/```(json)?/g, "").trim();

    let json;
    try {
      json = JSON.parse(content);
    } catch {
      // Fallback si falla el parseo
      json = esSQL
        ? { conversacion: "No se pudo generar una consulta SQL válida.", resultado: [{ sql: "", prueba: "desconocida" }] }
        : { conversacion: "No se pudo interpretar la instrucción para el PLC.", resultado: [{ topic: "Plc/Otros", mensaje: prompt.text }] };
    }

    // Re-evaluación del tipo basado en el contenido REAL de la respuesta
    // (Por si la heurística inicial falló pero GPT devolvió SQL)
    if (Array.isArray(json.resultado)) {
       const haySql = json.resultado.some(r => r.sql);
       const hayTopic = json.resultado.some(r => r.topic);
       
       if (haySql && !hayTopic) {
           json.tipo = "Sql";
           console.log("🔄 Corrección automática: Tipo cambiado a SQL por contenido.");
       } else if (hayTopic && !haySql) {
           json.tipo = "Plc";
       }
    }

    // ==========================================
    // PASO 7: POST-PROCESAMIENTO (LÓGICA IDENTIFICACIÓN)
    // ==========================================
    if (esIdentificacion) {
        json.tipo = "Plc";

        // Extracción de parámetros específicos con Regex local
        const matchOrden = promptLower.match(/orden\s*(\d+)/);
        const ordenDetectado = matchOrden ? parseInt(matchOrden[1]) : 1;

        const matchId = promptLower.match(/\b(?:id|caracterizacion|caracterización)\s*(\d+)/);
        const idDetectado = matchId ? parseInt(matchId[1]) : null;

        // Prioridad: Objeto > Regex > Default
        const orden = prompt.orden || ordenDetectado || 1;
        // Fix: Ensure we capture any number mentioned as an ID
        const matchAnyNumber = promptLower.match(/\b(\d+)\b/); 
        const numberInPrompt = matchAnyNumber ? parseInt(matchAnyNumber[1]) : null;

        // Support for ordinal numbers (primero, segundo, tercero, etc.)
        const ORDINALS = {
          'primero': 1, 'primera': 1, '1ro': 1, '1ra': 1,
          'segundo': 2, 'segunda': 2, '2do': 2, '2da': 2,
          'tercero': 3, 'tercera': 3, '3ro': 3, '3ra': 3,
          'cuarto': 4, 'cuarta': 4, '4to': 4, '4ta': 4,
          'quinto': 5, 'quinta': 5, '5to': 5, '5ta': 5,
          'ultimo': 'LAST', 'ultima': 'LAST'
        };
        let ordinalDetected = null;
        for (const [word, val] of Object.entries(ORDINALS)) {
            if (promptLower.includes(word)) {
                ordinalDetected = val;
                break;
            }
        }

        let idCaracterizacion = prompt.idCaracterizacion || idDetectado || numberInPrompt || null;
        
        // If ordinal word found and mapped to a number, use it (priority over random number if context implies order)
        if (ordinalDetected && typeof ordinalDetected === 'number') {
             // If user says "segundo id", we likely mean id=2 (or offset 2, but usually id 2 in this simple logic)
             // However, strictly speaking "segundo" usually refers to position (OFFSET/LIMIT), but the user said "el segundo id"
             // which usually implies the ID with value 2 OR the second record.
             // Given the previous user complaint "tomando el id 2", let's map ordinals to ID for now if specific ID logic is requested.
             if (!idCaracterizacion) idCaracterizacion = ordinalDetected; 
        }

        const numeroExplicito = prompt.numeroExplicito || idDetectado || null;
        const indiceCaracterizacion = prompt.indiceCaracterizacion || (idCaracterizacion ? idCaracterizacion : 1);

        // Construcción de Query SQL para obtener datos base
        let sqlQuery;
        if (idCaracterizacion) {
            sqlQuery = `SELECT * FROM caracterizacion WHERE id = ${idCaracterizacion};`;
        } else if (numeroExplicito) {
            sqlQuery = `SELECT * FROM caracterizacion WHERE id = ${numeroExplicito};`;
        } else {
            sqlQuery = `SELECT * FROM caracterizacion ORDER BY id ASC OFFSET ${indiceCaracterizacion - 1} LIMIT 1;`;
        }

        // Detección de flag "usarIA"
        const usarIA = PATTERNS.USO_IA.test(promptLower);
        console.log("🔍 [ServidorPc] Detección IA:", { prompt: promptLower, usarIA });

        // Sobrescribir resultado para Identificación
        json.resultado = [{
            topic: "Plc/Identificacion",
            mensaje: sqlQuery,
            orden,
            id: idCaracterizacion || numeroExplicito || null,
            usarIA: usarIA, 
        }];
        
        console.log("📦 [ServidorPc] Payload generado:", json.resultado[0]);

        // Ajustar mensaje conversacional
        const metodoTexto = usarIA ? "con Inteligencia Artificial" : "con método matemático";
        const refTexto = (idCaracterizacion || numeroExplicito) 
            ? `${idCaracterizacion || numeroExplicito}ª caracterización` 
            : `${indiceCaracterizacion}ª caracterización`;
            
        json.conversacion = `Identificando la planta ${metodoTexto} usando la ${refTexto} registrada (modelo de orden ${orden}).`;

    } else {
        // Si no es identificación, asignamos tipo base
        json.tipo = esSQL ? "Sql" : "Plc";
    }

    // ==========================================
    // PASO 8: ACTUALIZAR HISTORIAL
    // ==========================================
    historialConversacion.push({ role: "user", content: prompt.text });
    historialConversacion.push({ role: "assistant", content: JSON.stringify(json) });
    if (historialConversacion.length > 10) historialConversacion = historialConversacion.slice(-10);

    return json;

  } catch (error) {
    console.error("❌ Error en gtpServiceUniversal:", error);
    return {
      tipo: "Error",
      conversacion: "Ocurrió un error interno al procesar el prompt. Intenta de nuevo más tarde.",
      resultado: [{ topic: "Plc/Error", mensaje: prompt.text }],
    };
  }
};

module.exports = { gtpServiceUniversal };