// services/gptService.js
const OpenAI = require("openai");
const { config } = require("dotenv");
config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔹 Función: Traducir un prompt humano a un comando PLC estructurado en JSON
const gtpServicesCompara = async (prompt) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: `
Eres un asistente experto en traducción de comandos para PLC.
Tu única salida debe ser un objeto JSON válido.

### 1. COMPARACIÓN (Validación de Modelo)
Si el usuario quiere comparar, validar, ver diferencias o menciona explícitamente "comparación".
TAMBIÉN si describe una secuencia de movimientos ("Lleva a X, luego a Y") y pide comparar.
  {
    "accion": "comparacion",
    "canalAdc": 0,
    "canalPwm": 0,
    "tiempo_muestreo_ms": 50,
    "secuencia": [
      { "porcentaje": 30, "duracion_s": 20 },
      { "porcentaje": 10, "duracion_s": 30 }
    ],
    "descripcion": "Comparación Modelo vs Real"
  }

### IMPORTANTE:
- Usa SIEMPRE la clave "porcentaje".
- Si el usuario dice 'capacidad', 'potencia' o 'nivel', asúmelo como "porcentaje".
- "porcentaje" debe ser un número entre 0 y 100.

### EJEMPLOS:
- "Compara el modelo con la planta real" -> accion: "comparacion"
- "Lleva la capacidad al 50%" -> secuencia: [{"porcentaje": 50, ...}]
        `,
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" }, // ⚡ obliga al modelo a devolver solo JSON válido
  });

  // Devuelve el JSON ya parseado
  return JSON.parse(completion.choices[0]?.message?.content || "{}");
};

module.exports = { gtpServicesCompara };
