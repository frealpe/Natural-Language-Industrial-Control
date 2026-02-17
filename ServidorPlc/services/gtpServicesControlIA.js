// services/gptServiceControlIA.js
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 🧠 gtpServicesControlIA
 * ---------------------------
 * Genera la función ejecutarControlIA.js
 * basada en la cancelación del polo más lento de la planta.
 * Interpreta instrucciones en lenguaje natural (ej: "Controlador con setpoint de 7 V y 20 s de simulación").
 */
const gtpServicesControlIA = async ({
  coeficientes = { a1: 0.75, b0: 0.18, b1: 0.06 },
  Ts = 0.05,
  promptUsuario = "",
  isTestMode = false, // 🆕 Flag explícito para modo prueba
}) => {
  try {
    console.log("📝 Prompt recibido en gtpServicesControlIA:", promptUsuario, "| TestMode:", isTestMode);

    // 🕵️ Detección automática de "disturbio" en el prompt para activar modo prueba/perturbación
    const promptText = typeof promptUsuario === 'string' ? promptUsuario : JSON.stringify(promptUsuario);
    if (promptText.toLowerCase().includes("disturbio")) {
      isTestMode = true;
      console.log("🌪️ Detectada palabra clave 'disturbio' -> Activando isTestMode = true");
    }

    const { a1 = 0.9, b0 = 0.0, b1 = 0.1 } = coeficientes;
    console.log("🧮 Coeficientes para cálculo:", { a1, b0, b1 });

    // 🧠 Construcción dinámica del Prompt de Interpretación
    let promptInterpretation = `
Escribe SOLAMENTE JSON.
Interpretación de Parámetros:
- "setpoint_volt": Voltaje deseado (0 a 10V).
- "tiempo_simulacion_ms": Duración en ms.
- "alpha": Factor de aceleración de lazo cerrado (tau_cl = tau_ol / alpha).
  * Si piden "respuesta inferior al 70% del lazo abierto", alpha debe ser >= 1.43 (1/0.7).
  * Si piden "más rápido", alpha > 1. 
  * Valor típico: 1.5 a 3.0.
`;

    if (isTestMode) {
      promptInterpretation += `
- "perturbacion_volt": Magnitud de perturbación a añadir a la salida de control (volts). Default 0.
- "tiempo_perturbacion_ms": Momento en que inicia la perturbación (ms).
`;
    }

    promptInterpretation += `
Ejemplo de salida esperada:
{
  "setpoint_volt": 5.0,
  "tiempo_simulacion_ms": 15000,
  "alpha": 2.0,
  "canalAdc": 0,
  "canalPwm": 0`;
  
    if (isTestMode) {
      promptInterpretation += `,
  "perturbacion_volt": 2.0,
  "tiempo_perturbacion_ms": 5000`;
    }

    promptInterpretation += `
}

Instrucción del usuario:
"${promptUsuario}"
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: promptInterpretation }],
      temperature: 0.2,
    });

    // 🧩 Interpretar respuesta como JSON
    let parametrosExtraidos = {};
    let content = completion.choices[0].message.content;

    // Limpieza robusta de markdown
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("🧩 JSON Limpio extraído:", content);

    try {
      parametrosExtraidos = JSON.parse(content);
    } catch (e) {
      console.error("❌ Falló JSON.parse del controlador IA. Usando defaults.", e.message);
      parametrosExtraidos = {
        setpoint_volt: 5.0, // Default neutro si falla
        tiempo_simulacion_ms: 10000,
        alpha: 1.5,
        perturbacion_volt: 0,
        tiempo_perturbacion_ms: 0,
        canalAdc: 0,
        canalPwm: 0,
      };
    }

    const {
      setpoint_volt = 5.0,
      tiempo_simulacion_ms = 10000,
      alpha = 1.5,
      perturbacion_volt = 0,
      tiempo_perturbacion_ms = 0,
      canalAdc = 0,
      canalPwm = 0,
    } = parametrosExtraidos;

    // 🛡️ REGLAS DE SEGURIDAD Y RANGOS
    const safe_setpoint = Math.min(Math.max(Number(setpoint_volt) || 0, 0), 10); // Clamp 0-10V
    const safe_alpha = Math.max(Number(alpha) || 0.1, 0.1); // Evitar 0 o negativos
    const safe_perturbacion = Number(perturbacion_volt) || 0;
    const safe_tiempo_pert = Number(tiempo_perturbacion_ms) || 0;

    // ⚙️ Parámetros de la planta
    // ⚙️ Parámetros de la planta
    // Asegurar valores numéricos
    const val_a1 = Number(a1) || 0.9;
    const val_b0 = Number(b0) || 0;
    const val_b1 = Number(b1) || 0;

    const K = (val_b0 + val_b1) / (1 - val_a1); // ✅ robusto
    // Evitar NaN con log de negativos o cero. Si a1 <= 0, usamos abs o un default seguro.
    // Si a1 es muy cercano a 1, tau tiende a infinito.
    let safe_a1 = val_a1;
    if (safe_a1 <= 0.01 || safe_a1 >= 0.99) safe_a1 = 0.9;
    
    const tau = -Ts / Math.log(safe_a1);

    // 🎯 Diseño PI (cancelación del polo lento)
    const Ti = tau;
    const Kp = alpha / K;
    const Ki = Kp / Ti;

    const parametrosControl = {
      Ts,
      K,
      tau,
      alpha: safe_alpha,
      Kp: Number(Kp.toFixed(4)),
      Ti: Number(Ti.toFixed(4)),
      Ki: Number(Ki.toFixed(4)),
      setpoint_volt: safe_setpoint,
      tiempo_simulacion_ms,
      tiempo_muestreo_ms: Ts * 1000, // 💡 IMPORTANTE: Asegurar Ts correcto para el loop
      canalAdc,
      canalPwm,
      // Solo incluimos perturbación si estamos en modo test
      ...(isTestMode && { perturbacion_volt: safe_perturbacion, tiempo_perturbacion_ms: safe_tiempo_pert })
    };

    // 🔹 Generación de CÓDIGO por el Agente (LLM)
    let codePrompt = `
Eres un experto programador de sistemas de control en Node.js.
Genera un módulo CommonJS completo para 'services/ControlIA.js'.

Requisitos:
1. Importar 'rpiplc' desde "../rpiplc-addon/build/Release/rpiplc".
2. Importar 'Sockets' desde "../lib/socket".
3. Exportar una función async: ejecutarControlIA({ canalAdc, canalPwm, setpoint_volt, tiempo_muestreo_ms, tiempo_simulacion_ms${isTestMode ? ', perturbacion_volt, tiempo_perturbacion_ms' : ''} }).
4. Implementar un bucle de control basado en el NÚMERO DE MUESTRAS:
   - Calcular 'const num_muestras = Math.floor(tiempo_simulacion_ms / tiempo_muestreo_ms);'
   - Implementar un bucle 'for (let i = 0; i < num_muestras; i++)'.
   - Calcular 'const tiempo_actual = i * (tiempo_muestreo_ms / 1000);' (en segundos). Esto asegura múltiplos exactos.
   - Usar 'tiempo_actual' para logs y gráficas.
5. Parámetros de Sintonización (Ya calculados):
   - Kp: ${Kp.toFixed(4)}
   - Ki: ${Ki.toFixed(4)}
   - Ti: ${Ti.toFixed(4)}
   - Ts: ${Ts} seg (tiempo de muestro)
   - Alpha (speedup): ${safe_alpha}
6. Leer ADC 'rpiplc.readADC(canal)' -> Convertir a Voltaje (0-8.8V, 12bit=4095).
7. Calcular Error = Setpoint - Voltaje.
8. Calcular U (Acción de control) usando PI Discreto: u = u_ant + Kp*(e - e_ant) + Ki*Ts*e.
   - IMPORTANTE: Control de TIEMPO DE MUESTREO EXACTO:
     * Al inicio del bucle: 'const t_inicio = Date.now();'
     * Al final del bucle: 
       'const t_fin = Date.now();'
       'const t_espera = tiempo_muestreo_ms - (t_fin - t_inicio);'
       'if (t_espera > 0) await new Promise(r => setTimeout(r, t_espera));'
`;

    if (isTestMode) {
        codePrompt += `
9. PERTURBACIÓN (Disturbance Injection):
   - Verificar si (tiempo_actual * 1000) >= tiempo_perturbacion_ms.
   - Si es verdadero:
     * Añadir perturbacion_volt a la acción de control U ANTES de saturar.
     * console.log("⚠️ Disturbio ACTIVADO: " + perturbacion_volt + "V");
   - u_final = u_calculado + ((tiempo_actual * 1000) >= tiempo_perturbacion_ms ? perturbacion_volt : 0).
10. Saturar u_final entre 0 y 8.8V.
11. Escribir PWM 'rpiplc.writePWM(canal, valor_0_4095)'.
12. Enviar datos por Socket: 'Sockets.enviarMensaje("adcPlc", { tiempo: tiempo_actual, voltaje, pwm, error, u: u_final, perturbacion: ((tiempo_actual * 1000) >= tiempo_perturbacion_ms) })'.
13. Devolver objeto: { Prueba: new Date().toISOString(), parametros: {Kp, Ki, Ti, alpha, setpoint_volt, Ts, perturbacion_volt}, resultados:Array }.
`;
    } else {
        codePrompt += `
9. Saturar U entre 0 y 8.8V.
10. Escribir PWM 'rpiplc.writePWM(canal, valor_0_4095)'.
11. Enviar datos por Socket: 'Sockets.enviarMensaje("adcPlc", { tiempo: tiempo_actual, voltaje, pwm, error, u })'.
12. Devolver objeto: { Prueba: new Date().toISOString(), parametros: {Kp, Ki, Ti, alpha, setpoint_volt, Ts}, resultados:Array }.
`;
    }

    codePrompt += `
REGLAS:
- Solo devuelve CÓDIGO JavaScript válido.
- Usa 'module.exports = { ejecutarControlIA };' al final.
- No uses bloques markdown.
`;

    console.log("🤖 Solicitando código del controlador al Agente...");
    const codeCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // Usar modelo rápido pero capaz de codificar
      messages: [{ role: "user", content: codePrompt }],
      temperature: 0.1,
    });

    let code = codeCompletion.choices[0].message.content;
    
    // Limpieza básica de markdown
    code = code.replace(/```javascript/g, "").replace(/```/g, "").trim();

    const outputPath = path.join(process.cwd(), "services", "ControlIA.js");
    fs.writeFileSync(outputPath, code);

    return { ok: true, ruta: outputPath, parametrosControl };
  } catch (error) {
    console.error("❌ Error en gtpServicesControlIA:", error.message);
    return { ok: false, error: error.message };
  }
};

module.exports = { gtpServicesControlIA };
