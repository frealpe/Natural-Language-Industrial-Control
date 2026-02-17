// services/gptService.js
const OpenAI = require("openai");
const { config } = require("dotenv");
config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * gtpServicesCaracterizacion
 * ---------------------------
 * Traduce instrucciones naturales a parámetros de caracterización de planta discretos.
 * Devuelve JSON con claves exactas: N, PwmPin, AdcPin, Ts, Offset, amplitud
 * El agente trabaja con señales normalizadas (0 a 1) para PWM de 12 bits (0–4095) → 0–8.8V
 */
const gtpServicesCaracterizacion = async (prompt) => {
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("❌ El prompt no puede estar vacío o ser inválido.");
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
Eres un ingeniero experto en identificación de sistemas discretos
para una planta controlada con PWM de 12 bits (0–4095) equivalente a 0–8.8 V.

Tu tarea es devolver EXCLUSIVAMENTE UN JSON con los parámetros:

{
  "N": "1000",
  "PwmPin": "0",
  "AdcPin": "0",
  "Ts": "50",
  "Offset": "0.5",
  "amplitud": "0.1"
}

### REGLAS OBLIGATORIAS

1. La salida DEBE ser SOLO JSON, sin texto adicional.
2. Las claves deben ser exactamente:
   - N
   - PwmPin
   - AdcPin
   - Ts
   - Offset
   - amplitud

3. Los valores SIEMPRE deben estar NORMALIZADOS entre 0 y 1.
   Esto significa:
      Offset = VoltajeDeseado / 8.8
      amplitud = VoltajeAmplitud / 8.8

4. Si el usuario da números en voltios:
      "4.4 V" → Offset = 0.5  
      "0.88 V" → amplitud = 0.1  

5. Si da un rango en voltios:
      minV → minV/8.8  
      maxV → maxV/8.8  
      Offset = (min + max)/2
      amplitud = (max - min)/2

6. Si da un rango en porcentaje:
      20% a 60% → min=0.20, max=0.60  
      Offset = (min + max)/2
      amplitud = (max - min)/2

7. Si menciona amplitud ± :
      "offset 4.4 V y amplitud ±0.88 V"
       → Offset = 0.5
       → amplitud = 0.1

8. Asegurar SIEMPRE que:
      Offset + amplitud ≤ 1  
      Offset - amplitud ≥ 0  
   Si se pasa, ajustar amplitud automáticamente.

9. Si el usuario solo dice "caracterizar la planta":
   devolver:
   {
     "N": "1000",
     "PwmPin": "0",
     "AdcPin": "0",
     "Ts": "50",
     "Offset": "0.4",
     "amplitud": "0.1"
   }

### FORMATO FINAL OBLIGATORIO
Devuelve SOLO el JSON, sin explicaciones.
          `,
        },
        { role: "user", content: prompt },
      ],
    });

    const rawResponse = completion.choices?.[0]?.message?.content?.trim();
    if (!rawResponse) throw new Error("Respuesta vacía del modelo.");

    const parsed = JSON.parse(rawResponse);

    return parsed;

  } catch (error) {
    console.error("❌ Error en gtpServicesCaracterizacion:", error.message);

    return {
      N: "1000",
      PwmPin: "0",
      AdcPin: "0",
      Ts: "50",
      Offset: "0.5",
      amplitud: "0.1",
      error: "default_applied",
    };
  }
};

module.exports = { gtpServicesCaracterizacion };
