const path = require("path");

/**
 * ============================================================
 * IDENTIFICACIÓN AUTOMÁTICA DE MODELO ARX (ORDEN 1–3)
 * ============================================================
 * - Identifica modelos ARX(1), ARX(2), ARX(3) MATEMÁTICAMENTE.
 * - Simula cada modelo y calcula FIT/MSE.
 * - Selecciona el mejor usando IA (si se solicita) o Heurística (Parsimonia + FIT).
 */

async function identificarModeloAutomatico({
  data,
  conversacion = "",
  ordenMax = 3,
  //fitMinimo = 90,
  usarIA = false,
  orden = null
}) {
  /* 
   * imports 
   */
  // Importamos la función de selección IA y la función matemática
  const { seleccionarMejorModeloIA, identificarModeloMatematico } = require("./gtpServicesIndentificacion");
  const { logToFile } = require("../utils/fileLogger");
  
  logToFile(`🚀 INCIO IDENTIFICACIÓN AUTOMÁTICA. Recibidas ${data ? data.length : 'undefined'} muestras.`);

  if (!Array.isArray(data) || data.length < 10) {
    const err = `Datos insuficientes para identificación automática. Recibidos: ${data ? data.length : 0}`;
    logToFile(`❌ ${err}`);
    throw new Error(err);
  }

  const resultados = [];

  // Definir rango de órdenes a probar
  const ordenInicio = orden ? orden : 1;
  const ordenFin = orden ? orden : ordenMax;

  // 1. FASE DE CÁLCULO MATEMÁTICO (Siempre se ejecuta)
  for (let i = ordenInicio; i <= ordenFin; i++) {
    logToFile(`🧠 Calculando modelo ARX(${i}) (Matemático)...`);
    console.log(`🧠 Calculando modelo ARX(${i}) (Matemático)...`);

    // Llamada siempre al método matemático
    const res = await identificarModeloMatematico({
      data,
      conversacion,
      orden: i
    });
    
    // Validación básica de coeficientes
    if (!res.coeficientes || Object.keys(res.coeficientes).length === 0) {
        console.warn(`⚠️ [DEBUG] ARX(${i}) has NO coefficients! Skipping.`);
        continue;
    }
    
    // Generar ecuación string para referencia
    res.ecuacion = generarEcuacionString(i, res.coeficientes);
    console.log(`🔍 [DEBUG] Model ARX(${i}) Equation: "${res.ecuacion}"`);

    if (!res.ok) {
        console.warn(`⚠️ [DEBUG] ARX(${i}) Identification Failed: ${res.error || "Unknown Error"}`);
        continue;
    }

    // Validación de Estabilidad
    const { esEstable, polos } = verificarEstabilidad(res.coeficientes, i);
    if (!esEstable) {
       const msg = `⚠️ [DEBUG] ARX(${i}) Unstable (Poles: ${JSON.stringify(polos)})`;
       console.warn(msg);
       logToFile(msg);
       // Nota: No descartamos inmediatamente, dejamos que el selector decida si vale la pena.
    }

    // Simulación y Métricas
    // Necesitamos simular para obtener MSE y FIT. Como identificarModeloMatematico crea 'modelo.js',
    // podríamos usarlo, pero se está sobreescribiendo en cada iteración.
    // Usamos una simulación interna "ad-hoc" para calcular métricas sin lios de caché.
    const { mse } = validarModelo(res.coeficientes, data);
    
    // Si la validación falla (ej. datos insuficientes), saltar
    if (mse === null) continue;

    resultados.push({
      orden: i,
      coeficientes: res.coeficientes,
      Ts: res.Ts, // Asumimos que todos tienen el mismo Ts calculado
      mse,
      ecuacion: res.ecuacion,
      metodo: "Matemático",
      esEstable,
      polos // 🧠 Para análisis IA
    });

    console.log(
      `📊 ARX(${i}) → MSE: ${mse.toExponential(3)} | Estable: ${esEstable}`
    );
  }

  if (resultados.length === 0) {
    const errMsg = "No se pudo identificar ningún modelo válido (Todos rechazados).";
    logToFile(`❌ ${errMsg}`);
    throw new Error(errMsg);
  }

  // 2. FASE DE SELECCIÓN (Matemático / MSE)
  let seleccionado = null;
  const TsGlobal = resultados[0].Ts; 

  if (usarIA) {
      console.log("🧠 Solicitando análisis a la IA...");
      try {
          const decisionIA = await seleccionarMejorModeloIA({ 
              candidatos: resultados, 
              Ts: TsGlobal,
              conversacion 
          });
          
          if (decisionIA.ok && decisionIA.modelo) {
              seleccionado = decisionIA.modelo;
              seleccionado.metodo = "IA (Selección)";
              seleccionado.analisisIA = decisionIA.analisisIA || decisionIA.decisionIA; 
              console.log("⚡ IA seleccionó ARX(" + seleccionado.orden + ")");
          } else {
              errorIA = decisionIA.error || "IA devolvió ok=false";
          }
      } catch (err) {
          console.error("❌ Fallo Selección IA:", err.message);
          errorIA = err.message;
      }
  }

  if (!seleccionado) {
      console.log("🧠 Selección automática por MSE (Fallback)...");

  // Prioridad: 1. Estable, 2. MSE menor, 3. Menor Orden
  
  const estables = resultados.filter(r => r.esEstable);
  const pool = estables.length > 0 ? estables : resultados; 
  
  // Parsimonia: Menor orden entre los mejores MSE
  // Ordenamos por MSE ascendente (menor es mejor)
  seleccionado = pool.sort((a, b) => a.mse - b.mse)[0];
  seleccionado.metodo = "Criterio Matemático (MSE + Parsimonia)"; 
  } 


  // ===============================================
  // 3. PERSISTENCIA: RE-GENERAR EL MODELO ELEGIDO
  // ===============================================
  console.log(`💾 Guardando modelo seleccionado: ARX(${seleccionado.orden})`);
  
  // Volvemos a ejecutar el matemático para el orden ganador.
  // Esto tiene el efecto secundario deseado de regenerar el archivo 'services/modelo.js'
  // con los coeficientes correctos para el uso del sistema.
  await identificarModeloMatematico({
      data,
      conversacion,
      orden: seleccionado.orden
  });

  // 4. LOGGING DE ANÁLISIS
  if (seleccionado.analisisIA) {
      console.log(`\n🧠 [ANÁLISIS IA]:\n${JSON.stringify(seleccionado.analisisIA, null, 2)}\n`);
      logToFile(`🧠 [ANÁLISIS IA]: ${JSON.stringify(seleccionado.analisisIA)}`);
      
      // Enviamos al frontend
      try {
          const Sockets = require("../lib/socket"); // Importación dinámica para evitar ciclos si los hubiera
          Sockets.enviarMensaje("Logs", { 
              mensaje: seleccionado.analisisIA,
              modelo: seleccionado.orden,
              timestamp: new Date().toISOString()
          });
      } catch (err) {
          console.error("⚠️ Error enviando log a frontend:", err.message);
      }
  }

  return {
    ok: true,
    ordenSeleccionado: seleccionado.orden,
    coeficientes: seleccionado.coeficientes,
    Ts: seleccionado.Ts,
    mse: seleccionado.mse,
    candidatos: resultados,
    ecuacion: seleccionado.ecuacion,
    metodo: seleccionado.metodo,
    analisisIA: seleccionado.analisisIA
  };
}

/* ============================================================
 * HELPERS
 * ============================================================
 */

function validarModelo(coeficientes, data) {
    // Extraer coeficientes localmente
    const orden = Object.keys(coeficientes).filter(k => k.startsWith('a')).length;
    
    const yReal = [];
    const ySim = [];
    
    // Arrays de estado para la simulación
    // ARX: y[k] = a1*y[k-1] + ... + b0*u[k] + ...
    const bufferY = Array(orden).fill(0);
    // Necesitamos buffers de U hasta el orden. b0*u[k], b1*u[k-1]...
    const bufferU = Array(orden + 1).fill(0);

    for (const d of data) {
      if (d.pwm === undefined || d.conversion === undefined) continue;

      const FULL_SCALE = 4095;
      const ADC_CALIBRATION_FACTOR = 4095 / 3617; 

      const u = Number(d.pwm) / FULL_SCALE;
      const y = (Number(d.conversion) * ADC_CALIBRATION_FACTOR) / FULL_SCALE;

      let y_hat = 0;
      // Parte Autorregresiva (Outputs pasados)
      for(let i=1; i<=orden; i++) {
          y_hat += (coeficientes[`a${i}`] || 0) * bufferY[i-1]; // bufferY[0] es y[k-1]
      }
      // Parte Exógena (Inputs presentes y pasados)
      for(let i=0; i<=orden; i++) {
          y_hat += (coeficientes[`b${i}`] || 0) * bufferU[i]; // bufferU[0] es u[k]
      }

      // Actualizar buffers: Nuevo valor entra al inicio (idx 0), viejos se desplazan
      // bufferY = [y[k-1], y[k-2]...] -> entra y_hat como nuevo y[k-1] para la sgte
      bufferY.unshift(y_hat); 
      if (bufferY.length > orden) bufferY.pop();

      bufferU.unshift(u);     
      if (bufferU.length > orden + 1) bufferU.pop();

      yReal.push(y);
      ySim.push(y_hat);
    }

    if (yReal.length < 5) return { mse: 0 };

    const mse = calcularMSE(yReal, ySim);
    
    return { mse };
}

function calcularMSE(y, yHat) {
  let e = 0;
  for (let i = 0; i < y.length; i++) {
    e += Math.pow(y[i] - yHat[i], 2);
  }
  return e / y.length;
}


/**
 * Verifica si un modelo ARX es estable
 */
/* ======================================================
 * ESTABILIDAD REAL (POLINOMIO EN z)
 * ====================================================== */
function verificarEstabilidad(coef, orden) {
  // Construir polinomio característico A(z) = 1 - a1*z^-1 - ... - an*z^-n
  // Raíces de z^n - a1*z^{n-1} - ... - an = 0
  const p = [1];
  for (let i = 1; i <= orden; i++) {
    p.push(-(coef[`a${i}`] || 0));
  }

  const roots = calcularRaices(p);
  // Estable si todas las raíces están DENTRO del círculo unitario (|z| < 1)
  const esEstable = roots.every(r => Math.hypot(r.re, r.im) < 1.0);
  
  return { esEstable, polos: roots };
}

/* ======================================================
 * RAÍCES (ORDEN ≤ 3)
 * ====================================================== */
function calcularRaices(p) {
  const n = p.length - 1;

  if (n === 1) {
    return [{ re: -p[1] / p[0], im: 0 }];
  }

  if (n === 2) {
    const [a, b, c] = p;
    const d = b * b - 4 * a * c;

    if (d >= 0) {
      return [
        { re: (-b + Math.sqrt(d)) / (2 * a), im: 0 },
        { re: (-b - Math.sqrt(d)) / (2 * a), im: 0 }
      ];
    }
    return [
      { re: -b / (2 * a), im: Math.sqrt(-d) / (2 * a) },
      { re: -b / (2 * a), im: -Math.sqrt(-d) / (2 * a) }
    ];
  }

  // Durand–Kerner para orden 3
  if (n === 3) {
    let r = [
      { re: 1, im: 0 },
      { re: -0.5, im: 0.5 },
      { re: -0.5, im: -0.5 }
    ];

    for (let it = 0; it < 50; it++) {
      r = r.map((rk, k) => {
        let num = evalPoly(p, rk);
        let den = { re: 1, im: 0 };

        r.forEach((rj, j) => {
          if (j !== k) den = cMul(den, cSub(rk, rj));
        });
        
        // Evitar división por cero si roots colapsan
        if (den.re === 0 && den.im === 0) return rk;

        return cSub(rk, cDiv(num, den));
      });
    }
    return r;
  }
  return [];
}

/* ======================================================
 * COMPLEJOS
 * ====================================================== */
function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
function cMul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cDiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if(d === 0) return { re: 0, im: 0 };
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d
  };
}

function evalPoly(p, z) {
  let r = { re: 0, im: 0 };
  for (const c of p) r = cAdd(cMul(r, z), { re: c, im: 0 });
  return r;
}

function generarEcuacionString(orden, coeficientes) {
  let ecuacion = "y[k] = ";
  for (let i = 1; i <= orden; i++) {
    const val = coeficientes[`a${i}`] || 0;
    ecuacion += `${val.toFixed(4)}*y[k-${i}] + `;
  }
  for (let i = 0; i <= orden; i++) {
    const val = coeficientes[`b${i}`] || 0;
    ecuacion += `${val.toFixed(4)}*u[k-${i}] + `;
  }
  return ecuacion.replace(/ \+ $/, ""); 
}

module.exports = { identificarModeloAutomatico };
