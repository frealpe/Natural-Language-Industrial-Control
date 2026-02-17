const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { config } = require("dotenv");

config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Identificación de Sistemas usando IA Generativa (OpenAI GPT)
 * Utiliza el conocimiento del LLM para inferir un modelo ARX a partir de datos.
 */
/**
 * Identificación de Sistemas usando IA Generativa (OpenAI GPT)
 * Utiliza el conocimiento del LLM para SELECCIONAR el mejor modelo ARX de una lista de candidatos.
 */
async function seleccionarMejorModeloIA({ candidatos, Ts, conversacion = null }) {
  try {
    // 1. Construir el Prompt con los modelos ya calculados
    let prompt;
    const esUnico = candidatos.length === 1;

    if (esUnico) {
        // PROMPT DE ANÁLISIS (Sin selección)
        prompt = `
        Actúa como un experto en Ingeniería de Control.
        
        OBJETIVO:
        Analiza el siguiente modelo matemático calculado para el sistema.
        Explica DETALLADAMENTE si es estable o inestable basándote en los POLOS Calculados.
        Si la norma de todos los polos es < 1, confirma estabilidad. Si alguno es > 1, explica inestabilidad.
        
        MODELO:
        ${JSON.stringify(candidatos[0], null, 2)}
        
        FORMATO DE RESPUESTA JSON:
        {
            "analisis": "Justificación experta. DEBES mencionar explícitamente los valores de los polos y sus módulos para justificar la estabilidad."
        }
        `;
    } else {
        // PROMPT DE SELECCIÓN ORIGINAL
        prompt = `
        Actúa como un experto en Ingeniería de Control e Identificación de Sistemas.
        
        OBJETIVO:
        Analiza los modelos candidatos calculados matemáticamente para un sistema dinámico.
        Selecciona el MEJOR modelo considerando el compromiso entre simplicidad (Orden) y precisión (Varianza/Error).
        
        CRITERIOS DE SELECCIÓN:
        1. Estabilidad: PRIMORDIAL. Usa el campo "polos" de cada candidato. Si el módulo de algún polo es >= 1, descarta el modelo (a menos que los datos indiquen inestabilidad real).
        2. Parsimonia: Prefiere órdenes bajos si la mejora en varianza es marginal (<10%).
        3. Frecuencia de muestreo Ts = ${Number(Ts).toFixed(4)} s.
        
        MODELOS CANDIDATOS:
        ${JSON.stringify(candidatos, null, 2)}
        
        FORMATO DE RESPUESTA JSON (Estricto):
        {
            "analisis": "Breve justificación técnica. DEBES citar los polos del modelo elegido para probar su estabilidad (ej: 'Polos en 0.9 y 0.8, ambos < 1').",
            "modelo_seleccionado": {
                "indice": "Indice del array original (0, 1, 2...)", 
                "orden": 1 | 2 | 3
            }
        }
        `;
    }

    const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Eres un experto en control. Tu salida debe ser exclusivamente el JSON de decisión." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    const decision = JSON.parse(completion.choices[0]?.message?.content || "{}");
    
    // 3. Extraer el modelo que la IA seleccionó usando el índice
    let idx;
    if (esUnico) {
        idx = 0;
    } else {
        idx = decision.modelo_seleccionado?.indice;
    }

    const seleccion = (idx !== undefined && idx !== null) ? candidatos[idx] : candidatos.find(c => c.orden == decision.modelo_seleccionado?.orden);

    if (!seleccion) {
        throw new Error("La IA seleccionó un índice o orden no válido: " + JSON.stringify(decision.modelo_seleccionado));
    }
    
    // 4. Guardar el modelo ganador REGENERANDOLO o llamando a un helper
    // Nota: El caller se encarga de la persistencia final o aquí llamamos a un helper compartido.
    // Usaremos generarModeloCompleto aquí para asegurar que 'modelo.js' se actualice con la decisión de la IA.
    generarModeloCompleto(
        seleccion.orden, 
        seleccion.coeficientes, 
        Ts, 
        seleccion.varianza || 0, 
        "Selección Experta IA"
    );

    return {
        ok: true,
        decisionIA: decision, // Devolvemos el análisis completo para el frontend
        analisisIA: decision.analisis, // Explicitly pull out the text for easy access
        modelo: seleccion,
        // Flatten critical fields for compatibility
        coeficientes: seleccion.coeficientes,
        Ts: Ts,
        varianza: seleccion.varianza,
        ecuacion: seleccion.ecuacion,
        orden: seleccion.orden
    };

  } catch (error) {
    console.error("❌ Error en flujo experto (Selección):", error.message);
    // Fallback: Retornar el de mejor ajuste numérico (el último o el de menor error)
    // Asumimos que candidatos está ordenado o tiene métricas.
    // Simplemente lanzamos error o devolvemos false para que el fallback matemático ocurra fuera.
    return { ok: false, error: error.message };
  }
}
/**
 * Convierte los arrays de GPT a objeto {a1, a2, b0...}
 */
function mapearCoeficientesGPT(modeloIA, orden) {
    const coef = {};
    
    // Coeficientes A (a1, a2...)
    if (Array.isArray(modeloIA.coeficientes_a)) {
        modeloIA.coeficientes_a.forEach((val, i) => {
            if (i < orden) coef[`a${i + 1}`] = val;
        });
    }

    // Coeficientes B (b0, b1...)
    if (Array.isArray(modeloIA.coeficientes_b)) {
        modeloIA.coeficientes_b.forEach((val, i) => {
            if (i <= orden) coef[`b${i}`] = val;
        });
    }
    
    return coef;
}

/**
 * =====================================================================
 * IMPLEMENTACIÓN MATEMÁTICA ORIGINAL (Respaldo / Fallback)
 * Identificación ARX por Batch Least Squares (offline)
 * =====================================================================
 */
async function identificarModeloMatematico({ data, conversacion = null, orden }) {
  try {
    // Validaciones
    if (!Number.isInteger(orden) || orden < 1 || orden > 3) {
      throw new Error("El 'orden' debe ser un entero 1, 2 o 3.");
    }

    if (!Array.isArray(data) || data.length < 10) {
      throw new Error("Se requieren al menos 10 muestras.");
    }

    // Preprocesar datos
    const { datosNormalizados, Ts } = preprocesarDatos(data);
    
    // Descartar transitorio inicial (primeros 20%)
    const indiceInicio = Math.floor(datosNormalizados.length * 0.2);
    const datosEstables = datosNormalizados.slice(indiceInicio);

    // Construir matrices para Least Squares
    const { Phi, Y } = construirMatrices(datosEstables, orden);

    // Resolver: theta = (Phi' * Phi)^-1 * Phi' * Y
    const coeficientes = resolverLeastSquares(Phi, Y, orden);

    // Calcular métricas
    const errores = calcularErrores(datosEstables, coeficientes, orden);
    const { varianza, autocorr } = calcularMetricas(errores);

    // Generar archivo de modelo
    generarModeloCompleto(orden, coeficientes, Ts, varianza, "Matemático");

    return {
      ok: true,
      coeficientes,
      Ts,
      varianza,
      autocorr,
      conversacion,
    };
  } catch (error) {
    console.error("❌ Error identificación Matemática:", error.message);
    return {
      ok: false,
      error: error.message,
      coeficientes: {},
      Ts: null,
      conversacion,
    };
  }
}

/**
 * Preprocesa los datos: filtrado, normalización y cálculo de Ts
 */
// Helper to safely get property case-insensitive
function getVal(obj, keys) {
    if (!obj) return null;
    for (const k of keys) {
      // Direct match
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      // Case insensitive match
      const lowerK = k.toLowerCase();
      const foundKey = Object.keys(obj).find(ok => ok.toLowerCase() === lowerK);
      if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) return obj[foundKey];
    }
    return null;
}

function preprocesarDatos(data) {
  if (data && data.length > 0) {
      console.log(`🔍 [DEBUG] First raw data item keys:`, Object.keys(data[0]));
      console.log(`🔍 [DEBUG] First raw data item values:`, data[0]);
  }

  const datosLimpios = data
    .map(d => {
        const rawT = getVal(d, ['tiempo', 'time', 't']);
        const rawPwm = getVal(d, ['pwm', 'u', 'input', 'entrada']);
        const rawY = getVal(d, ['conversion', 'adc', 'y', 'output', 'valor', 'salida']);
        
        // Ensure missing values become NaN, not 0
        const t = rawT !== null ? Number(rawT) : NaN;
        const pwm = rawPwm !== null ? Number(rawPwm) : NaN;
        const y = rawY !== null ? Number(rawY) : NaN;
        
        return { t, pwm, conversion: y };
    })
    .filter((d) => !isNaN(d.t) && !isNaN(d.pwm) && !isNaN(d.conversion));

  console.log(`🔍 [DEBUG] preprocesarDatos: Input=${data?.length}, Output=${datosLimpios.length}, Ts=calc...`);

  // Ts promedio
  const difs = [];
  for (let i = 1; i < datosLimpios.length; i++) {
    const dt = datosLimpios[i].t - datosLimpios[i - 1].t;
    if (dt > 0) difs.push(dt);
  }
  const Ts = difs.length > 0 ? difs.reduce((a, b) => a + b, 0) / difs.length : 0.05;

  // Normalización con calibración
  const ADC_CALIBRATION_FACTOR = 4095 / 3617;
  const datosNormalizados = datosLimpios.map((d) => ({
    u: d.pwm / 4095,
    y: (d.conversion * ADC_CALIBRATION_FACTOR) / 4095,
  }));

  console.log(`🔍 [DEBUG] preprocesarDatos: OutputFinal=${datosNormalizados.length}, Ts=${Ts.toFixed(4)}`);
  return { datosNormalizados, Ts };
}

/**
 * Construye matrices de regresión para ARX
 * Phi * theta = Y
 */
function construirMatrices(datos, orden) {
  const N = datos.length - orden;
  const dim = 2 * orden + 1; // [a1...an, b0...bn]

  const Phi = [];
  const Y = [];

  for (let k = orden; k < datos.length; k++) {
    const fila = [];

    // Parte AR: [y[k-1], y[k-2], ..., y[k-n]]
    for (let i = 1; i <= orden; i++) {
      fila.push(datos[k - i].y);
    }

    // Parte X: [u[k], u[k-1], ..., u[k-n]]
    for (let i = 0; i <= orden; i++) {
      fila.push(datos[k - i].u);
    }

    Phi.push(fila);
    Y.push(datos[k].y);
  }

  return { Phi, Y };
}

/**
 * Resuelve sistema por Least Squares: theta = (Phi' * Phi)^-1 * Phi' * Y
 */
function resolverLeastSquares(Phi, Y, orden) {
  const dim = 2 * orden + 1;

  // Phi' * Phi
  const PhiT_Phi = Array(dim)
    .fill(0)
    .map(() => Array(dim).fill(0));

  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      for (let k = 0; k < Phi.length; k++) {
        PhiT_Phi[i][j] += Phi[k][i] * Phi[k][j];
      }
    }
  }

  // Phi' * Y
  const PhiT_Y = Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    for (let k = 0; k < Phi.length; k++) {
      PhiT_Y[i] += Phi[k][i] * Y[k];
    }
  }

  // Resolver (Phi'Phi)^-1 * (Phi'Y) usando Gauss
  const theta = resolverGauss(PhiT_Phi, PhiT_Y);

  // Mapear a formato {a1, ..., b0, ...}
  const coef = {};
  for (let i = 0; i < orden; i++) {
    coef[`a${i + 1}`] = theta[i];
  }
  for (let i = 0; i <= orden; i++) {
    coef[`b${i}`] = theta[orden + i];
  }

  return coef;
}

/**
 * Resolución de sistema lineal por eliminación Gaussiana
 */
function resolverGauss(A, b) {
  const n = b.length;
  const Ab = A.map((fila, i) => [...fila, b[i]]);

  // Eliminación hacia adelante
  for (let i = 0; i < n; i++) {
    // Pivote
    let maxFila = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(Ab[k][i]) > Math.abs(Ab[maxFila][i])) {
        maxFila = k;
      }
    }
    [Ab[i], Ab[maxFila]] = [Ab[maxFila], Ab[i]];

    // Eliminación
    for (let k = i + 1; k < n; k++) {
      const factor = Ab[k][i] / Ab[i][i];
      for (let j = i; j <= n; j++) {
        Ab[k][j] -= factor * Ab[i][j];
      }
    }
  }

  // Sustitución hacia atrás
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = Ab[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= Ab[i][j] * x[j];
    }
    x[i] /= Ab[i][i];
  }

  return x;
}

/**
 * Calcula errores de predicción
 */
function calcularErrores(datos, coef, orden) {
  const errores = [];

  for (let k = orden; k < datos.length; k++) {
    let y_pred = 0;

    // AR
    for (let i = 1; i <= orden; i++) {
      y_pred += coef[`a${i}`] * datos[k - i].y;
    }

    // X
    for (let i = 0; i <= orden; i++) {
      y_pred += coef[`b${i}`] * datos[k - i].u;
    }

    errores.push(datos[k].y - y_pred);
  }

  return errores;
}

/**
 * Calcula métricas de calidad
 */
function calcularMetricas(errores) {
  const mean = errores.reduce((s, e) => s + e, 0) / errores.length;
  const varianza = errores.reduce((s, e) => s + (e - mean) ** 2, 0) / errores.length;

  let autocorr = 0;
  if (errores.length > 1) {
    autocorr =
      errores.slice(1).reduce((s, e, i) => s + e * errores[i], 0) / (errores.length - 1);
  }

  return { varianza, autocorr };
}

/**
 * Genera modelo.js con función completa
 */
function generarModeloCompleto(orden, coeficientes, Ts, varianza, metodo = "Desconocido") {
  const varsY = Array.from({ length: orden }, (_, i) => `y_${i + 1}`);
  const varsU = Array.from({ length: orden }, (_, i) => `u_${i + 1}`);

  let ecuacion = "";
  for (let i = 1; i <= orden; i++) {
    const val = coeficientes[`a${i}`] || 0;
    ecuacion += `(${val.toFixed(6)} * y_${i}) + `;
  }
  for (let i = 0; i <= orden; i++) {
    const val = coeficientes[`b${i}`] || 0;
    const varU = i === 0 ? "u" : `u_${i}`;
    ecuacion += `(${val.toFixed(6)} * ${varU}) + `;
  }
  ecuacion = ecuacion.replace(/ \+ $/, ";");

  const codigo = `
// Modelo ARX Generado ${new Date().toISOString()} (${metodo})
// Orden: ${orden} | Ts: ${Ts.toFixed(6)} s | Var: ${varianza.toExponential(3)}

let ${varsY.join(", ")};
let ${varsU.join(", ")};

${varsY.map((v) => `${v} = 0;`).join("\n")}
${varsU.map((v) => `${v} = 0;`).join("\n")}

function modeloPlanta(u) {
  const y = ${ecuacion}

  ${varsY.slice(1).reverse().map((v, i) => `${varsY[varsY.length - 1 - i]} = ${varsY[varsY.length - 2 - i]};`).join("\n  ")}
  y_1 = y;

  ${varsU.slice(1).reverse().map((v, i) => `${varsU[varsU.length - 1 - i]} = ${varsU[varsU.length - 2 - i]};`).join("\n  ")}
  u_1 = u;

  return y;
}

const coeficientes = ${JSON.stringify(coeficientes, null, 2)};

module.exports = { modeloPlanta, coeficientes };
`;

  fs.writeFileSync(path.join(process.cwd(), "services", "modelo.js"), codigo, "utf8");
  console.log(`💾 Archivo services/modelo.js actualizado por [${metodo}] (Orden ${orden})`);
}

module.exports = { seleccionarMejorModeloIA, identificarModeloMatematico };
