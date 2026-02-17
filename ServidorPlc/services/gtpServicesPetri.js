// services/gptServicePetri.js
const OpenAI = require("openai");
const { config } = require("dotenv");
config();

// 🔹 Mapa de pines físicos del PLC
const PINES = {
  "0": 20971532,
  "1": 20971531,
  "2": 20971535,
  "3": 20971534,
  "4": 20971526,
  "5": 20971527,
  "6": 20971522,
  "7": 20971520,
  "8": 20971530,
  "9": 21037057,
  "10": 20971529,
  "11": 21037056,
  "12": 20971533,
  "13": 20971528,
  "14": 20971525,
  "15": 20971521,
  "16": 21037063,
  "17": 21037062,
  "18": 21037059,
  "19": 21037061,
  "20": 21037058,
  "21": 21037060,
  "22": 20971524,
  "23": 20971523,
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * gtpServicesPetri
 * ---------------------------
 * Analiza un JSON de red de Petri enviado desde el Frontend
 * y genera simulación + función PLC + función JS ejecutable.
 */
const gtpServicesPetri = async (petriJson) => {
  if (!petriJson || typeof petriJson !== "object") {
    throw new Error("❌ El archivo JSON de la red de Petri es inválido o está vacío.");
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `
Eres un ingeniero experto en **Redes de Petri** aplicadas al **control mediante PLC y simulación**.

Recibirás un JSON con la estructura de una red de Petri (lugares, transiciones, arcos, marcado inicial y pines asociados).

Debes devolver un JSON con esta estructura:

{
  "validation": { "isValid": true, "warnings": [] },
  "simulation_steps": [ ... ],
  "plc_function": "FUNCTION ExecutePetriNetwork() ... END_FUNCTION",
  "js_function": "function ejecutarRedPetri(red) { ... }"
}

🧩 Requisitos:
1️⃣ La propiedad "plc_function" debe contener código Structured Text (IEC 61131-3).
2️⃣ La propiedad "js_function" debe contener código JavaScript válido que:
   - Reciba el JSON original de la red.
   - Contenga un arreglo \`marking\` que representa las fichas.
   - Evalue qué transiciones pueden dispararse (todas las precondiciones cumplidas).
   - Actualice los lugares y genere los nuevos marcados.
   - Devuelva un objeto con el nuevo estado de la red.
3️⃣ Si hay pines asociados, puedes mostrar en consola su activación (\`console.log\`).
4️⃣ No devuelvas texto fuera del JSON.
          `,
        },
        { role: "user", content: "Aquí está el JSON de la red de Petri:" },
        { role: "user", content: JSON.stringify(petriJson, null, 2) },
      ],
      response_format: { type: "json_object" },
    });

    const rawResponse = completion.choices?.[0]?.message?.content?.trim();
    if (!rawResponse) throw new Error("Respuesta vacía del modelo.");

    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (err) {
      console.warn("⚠️ JSON con ruido, intentando limpiar...");
      const repaired = rawResponse.replace(/^[^{]+|[^}]+$/g, "");
      parsed = JSON.parse(repaired);
    }

    // 🔹 Sustituir pines en la función PLC
    if (parsed?.plc_function) {
      parsed.plc_function = replacePinAddresses(parsed.plc_function);
    }

    // 🔹 Guardar la función JS localmente para pruebas
    if (parsed?.js_function) {
      const fs = require("fs");
      const path = require("path");
      const rutaSim = path.join(process.cwd(), "services", "petriSim.js");
      fs.writeFileSync(rutaSim, parsed.js_function);
      console.log("✅ Función JS de simulación guardada en:", rutaSim);
    }

    return parsed;
  } catch (error) {
    console.error("❌ Error en gtpServicesPetri:", error.message);
    return { error: true, message: error.message };
  }
};

/**
 * Reemplaza los identificadores de pines por las direcciones reales.
 * Ejemplo: "PIN_3" -> "%QX20971534"
 */
function replacePinAddresses(code) {
  let replacedCode = code;
  for (const [pin, address] of Object.entries(PINES)) {
    const regex = new RegExp(`PIN_${pin}`, "g");
    replacedCode = replacedCode.replace(regex, `%QX${address}`);
  }
  return replacedCode;
}

module.exports = { gtpServicesPetri, PINES };
