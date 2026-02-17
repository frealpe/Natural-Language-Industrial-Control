const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function identificarModeloIA({ data, conversacion, orden }) {
  try {
    const instruccion =
      conversacion ||
      `Desarrolla el modelo matemático de la planta de acuerdo al orden ${orden}.`;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("El campo 'data' debe ser un array con datos válidos.");
    }

    const datosFormateados = data
      .filter(
        (d) =>
          d.pwm !== undefined &&
          d.voltaje !== undefined &&
          d.tiempo !== undefined
      )
      .map(({ tiempo, pwm, voltaje }) => ({
        t: Number(tiempo),
        u: Number(pwm),
        y: Number(voltaje),
      }));

    if (datosFormateados.length < 3) {
      throw new Error(
        "Se requieren al menos 3 muestras válidas para calcular el tiempo de muestreo."
      );
    }

    const difs = datosFormateados
      .slice(1)
      .map((d, i) => datosFormateados[i + 1].t - datosFormateados[i].t)
      .filter((dt) => !isNaN(dt) && dt > 0);

    const Ts =
      difs.length > 0 ? difs.reduce((a, b) => a + b, 0) / difs.length : 0.1;

    const pwmMax = Math.max(...datosFormateados.map((d) => d.u));
    const voltMax = Math.max(...datosFormateados.map((d) => d.y));

    const datosNormalizados = datosFormateados.map((d) => ({
      t: d.t,
      u: d.u / 4096,
      y: d.y / 10,
    }));

    const textoDatos = JSON.stringify(datosNormalizados, null, 2);

    const prompt = `
Actúa como un ingeniero experto en identificación de sistemas discretos.

Instrucciones del usuario:
"${instruccion}"

El orden hace referencia al orden del modelo ARX (primer, segundo o tercer orden).

Usa un tiempo de muestreo Ts = ${Ts.toFixed(6)} segundos.

Con base en los siguientes datos experimentales de la planta:
- Entrada (u[k]): PWM aplicado al sistema (normalizado)
- Salida (y[k]): Voltaje medido en el sistema (normalizado)
- Tiempo (t[k]): instante de muestreo

Genera **un archivo Node.js listo para usar** que incluya:
1️⃣ 'const coeficientes' con los coeficientes del modelo.
2️⃣ 'function modeloPlanta(u)' que simule la salida discreta y[k] usando la **entrada actual u**.
3️⃣ 'module.exports = { modeloPlanta, coeficientes };'
4️⃣ No uses 'export' ni comentarios adicionales.
5️⃣ Devuelve solo código JavaScript válido para Node.js.

Datos experimentales (primeras muestras):
${textoDatos}
`;

    console.log("🤖 Solicitando a GPT la identificación del modelo...");

    const respuesta = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "Eres un ingeniero experto en control e identificación de sistemas discretos.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    // --- Obtener y limpiar código ---
    let codigoModelo = respuesta.choices[0].message.content.trim();
    codigoModelo = codigoModelo
      .replace(/```(javascript)?/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .trim();

    // --- Reemplazar cualquier referencia a u_prev por u actual ---
    codigoModelo = codigoModelo.replace(/\bu_prev\b/g, "u");

    // --- Asegurar que se use module.exports ---
    if (!codigoModelo.includes("module.exports")) {
      codigoModelo += "\n\nmodule.exports = { modeloPlanta, coeficientes };";
    }

    // --- Extraer coeficientes ---
    let coeficientes = {};
    const matchObject = codigoModelo.match(/coeficientes\s*=\s*(\{[^}]*\})/);
    try {
      if (matchObject) {
        coeficientes = JSON.parse(
          matchObject[1].replace(/(\w+)\s*:/g, '"$1":').replace(/,\s*}/g, "}")
        );
      }
    } catch {
      coeficientes = {};
    }

    // --- Guardar archivo ---
    const rutaArchivo = path.join(process.cwd(), "services", "modelo.js");
    fs.writeFileSync(rutaArchivo, codigoModelo);

    const respuestaUsuario = `✅ Modelo identificado correctamente (Node.js).\n🔢 Coeficientes: ${JSON.stringify(
      coeficientes
    )}\n🕒 Tiempo de muestreo: ${Ts.toFixed(6)} s.`;

    const conversacionActualizada =
      typeof conversacion === "string"
        ? `${instruccion}\n${respuestaUsuario}`
        : [
            ...(Array.isArray(conversacion) ? conversacion : []),
            { role: "assistant", content: respuestaUsuario },
          ];

    return {
      ok: true,
      error: null,
      coeficientes,
      Ts,
      pwmMax,
      voltMax,
      conversacion: conversacionActualizada,
    };
  } catch (error) {
    console.error("❌ Error al identificar el modelo:", error);
    const conversacionError =
      typeof conversacion === "string"
        ? `${conversacion}\n❌ Error: ${error.message}`
        : [
            ...(conversacion || []),
            {
              role: "assistant",
              content: `❌ Error durante la identificación: ${error.message}`,
            },
          ];
    return {
      ok: false,
      error: error.message,
      coeficientes: {},
      Ts: null,
      conversacion: conversacionError,
    };
  }
}

module.exports = { identificarModeloIA };
