const rpiplc = require("../rpiplc-addon/build/Release/rpiplc");
const { PINES } = require("./helpers");
const Sockets = require("../lib/socket");
const { publicarMQTT } = require("../mqtt/conectMqtt");
const { modeloPlanta } = require("../services/modelo");

// =======================
// Constantes de calibración
// =======================
// Factor de calibración ADC basado en medición empírica:
// PWM 4095 → ADC ≈ 3617
const ADC_CALIBRATION_FACTOR = 4095 / 3617; // ≈ 1.132
const MAX_VOLTAGE = 8.8; // Voltaje máximo del sistema
const PWM_MAX = 4095; // PWM de 12 bits
// =======================
// Escritura digital
// =======================
const escribirSalida = ({ pin, valor }) => {
  if (pin !== undefined && (valor === 0 || valor === 1)) {
    rpiplc.writeDigital(PINES[pin], valor);
    console.log(`✅ Salida ${PINES[pin]} configurada en ${valor}`);
    return `✅ Salida ${pin} configurada en ${valor}`;
  }
  return `⚠️ Pin ${pin} no definido o valor inválido`;
};

// =======================
// Lectura digital
// =======================
const leerEntrada = (pin) => {
  if (pin !== undefined) {
    const valor = rpiplc.readDigital(PINES[pin]);
    return valor;
  }
  return `⚠️ Pin ${pin} no definido en la tabla`;
};

// =======================
// Lectura de ADC
// =======================
const leerADC = async ({ canal, tiempo, emitir = true }) => {
  //console.log("canal",canal);
  if (canal !== undefined) {
    const conversion = rpiplc.readADC(canal);
    //console.log(conversion);
    if (emitir) {
      Sockets.enviarMensaje('adcPlc',{ canal, conversion, tiempo });
    }
    return conversion >= 0 ? conversion : 0; // asegura valor no negativo
  }
  return null;
};

// =======================
// Lectura periódica de ADC
// =======================
const ejecutarADC = async ({ canal, muestreo, duracion }) => {
  const fin = Date.now() + duracion;
  const resultado = [];
  const Ts = muestreo / 1000; // segundos
  let tiempoTranscurrido = 0;

  while (Date.now() < fin) {
    const tiempoActual = parseFloat(tiempoTranscurrido.toFixed(2));

    const conversion = await leerADC({canal, tiempo: tiempoActual });
    const voltage = (MAX_VOLTAGE * conversion * ADC_CALIBRATION_FACTOR) / PWM_MAX;
    resultado.push({
      canal,
      tiempo: tiempoActual,
      voltaje:voltage,
    });
    tiempoTranscurrido += Ts;
    await new Promise((r) => setTimeout(r, muestreo));
  }

  return resultado;
};

// =======================
// Escritura de PWM
// =======================
const escribirPWM = ( canal, pwmValue ) => {
  if (canal !== undefined && pwmValue >= 0 && pwmValue <= 4095) {
    rpiplc.writePWM(canal, pwmValue);
    return Math.round(pwmValue);
  }
  return `⚠️ Canal PWM ${canal} no definido o duty inválido`;
};

// =======================
// Control PI discreto (con anti-windup, 12 bits PWM)
// =======================
const ejecutarControlPI = async ({
  canalAdc,
  canalPwm,
  setpoint_volt,
  tiempo_muestreo_ms,
  tiempo_simulacion_ms,
}) => {
  // console.log(
  //   `📡 Iniciando Control PI: ADC${canalAdc} → PWM${canalPwm}, SetPoint=${setpoint_volt}V, Ts=${tiempo_muestreo_ms}ms, Duración=${tiempo_simulacion_ms}ms`
  // );

  // Parámetros del controlador
  const Kp = 1.2;
  const Ti = 0.5049;
  const Ts = tiempo_muestreo_ms / 1000.0; // tiempo de muestreo en segundos

  let integralError = 0.0;
  let tiempoTranscurrido = 0;
  const fin = Date.now() + tiempo_simulacion_ms;
  const resultados = [];

  // Función interna del controlador PI
  function piController(error) {
    // Salida sin saturación
    let u = Kp * (error + (integralError / Ti));

    // Saturación
    if (u > 8.8) u = 8.8;
    if (u < 0.0) u = 0.0;

    // Anti-windup: integrar solo si no está saturado
    if (u > 0.0 && u < 8.8) {
      integralError += Ts * error;
    }

    return u;
  }

  // Bucle de control
  while (Date.now() < fin) {
    // 1️⃣ Leer ADC
    const conversion = await leerADC({ canal: canalAdc, tiempo: tiempoTranscurrido });

    // 2️⃣ Escalar a voltaje con calibración
    const voltage = (MAX_VOLTAGE * conversion * ADC_CALIBRATION_FACTOR) / PWM_MAX;

    // 3️⃣ Calcular error
    const error = setpoint_volt - voltage;

    // 4️⃣ Aplicar controlador PI
    const controlVoltage = piController(error);

    // 5️⃣ Escalar salida a PWM 12 bits
    const valorPWM = Math.round((controlVoltage * PWM_MAX) / MAX_VOLTAGE);

    // 6️⃣ Escribir salida PWM
    rpiplc.writePWM(canalPwm, valorPWM);
    // o: await escribirPWM({ canal: canalPwm, valorPWM });

    // 7️⃣ Guardar resultados
    resultados.push({
      tiempo: tiempoTranscurrido.toFixed(2),
      voltaje: voltage.toFixed(2),
      pwm: valorPWM,
    });

    // 8️⃣ Esperar siguiente muestreo
    tiempoTranscurrido += Ts;
    await new Promise((r) => setTimeout(r, tiempo_muestreo_ms));
  }

  return {
    Prueba: new Date().toISOString(),
    resultados,
  };
};
// =======================
// Caracterización del sistema
// =======================
const ejecutarCaracterizacion = async ({
  canalAdc = 0,
  canalPwm = 0,
  tiempo_muestreo_ms = 100,
  secuencia = [
    { porcentaje: 30, duracion_s: 20 },
    { porcentaje: 10, duracion_s: 30 },
  ],
}) => {
  const resultados = [];
  const Ts = tiempo_muestreo_ms / 1000; // segundos
  let tiempoTranscurrido = 0;

  //console.log(`⚙️ Iniciando caracterización secuencial PWM-ADC...`);

  for (const paso of secuencia) {
    const pwmObjetivo = Math.round((paso.porcentaje / 100) * 4095);
    const duracionPasoMs = paso.duracion_s * 1000;
    const inicioPaso = Date.now();
    const finPaso = inicioPaso + duracionPasoMs;

   // console.log(`➡️ Nivel ${paso.porcentaje}% (${pwmObjetivo}) durante ${paso.duracion_s}s`);

    // Mantiene el PWM constante en este nivel durante la duración especificada
    while (Date.now() < finPaso) {
      // 1️⃣ Escribir PWM
      rpiplc.writePWM(canalPwm, pwmObjetivo);
      // 2️⃣ Leer ADC
      const conversion = await leerADC({
        canal: canalAdc,
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
      });

      // 3️⃣ Escalar ADC a voltaje con calibración
      const voltaje = (MAX_VOLTAGE * conversion * ADC_CALIBRATION_FACTOR) / PWM_MAX;

      // 4️⃣ Guardar registro
      resultados.push({
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
        pwm: pwmObjetivo,
        voltaje: parseFloat(voltaje.toFixed(3)),
      });

      // 5️⃣ Esperar siguiente muestreo
      tiempoTranscurrido += Ts;
      await new Promise((r) => setTimeout(r, tiempo_muestreo_ms));
    }
  }

  // 🧾 Resultado final
  return {
    Prueba: new Date().toISOString(),
    resultados,
  };
};
//
const ejecutarComparacion = async ({
  accion="comparacion",
  canalAdc = 0,
  canalPwm = 0,
  tiempo_muestreo_ms = 50,
  secuencia = [
    { porcentaje: 30, duracion_s: 20 },
    { porcentaje: 10, duracion_s: 30 },
  ],
}) => {
  const resultados = [];
  const Ts = tiempo_muestreo_ms / 1000; // segundos
  let tiempoTranscurrido = 0;
  console.log(`⚙️ Iniciando comparación secuencial PWM-Modelo...`,secuencia);
  for (const paso of secuencia) {
    console.log("🔍 [DEBUG] Paso actual:", JSON.stringify(paso));
    const porcentaje = paso.porcentaje !== undefined ? paso.porcentaje : (paso.valor !== undefined ? paso.valor : (paso.capacidad !== undefined ? paso.capacidad : 0));
    const pwmObjetivo = Math.round((porcentaje / 100) * 4095);
    const duracionPasoMs = paso.duracion_s * 1000;
    const inicioPaso = Date.now();
    const finPaso = inicioPaso + duracionPasoMs;

    while (Date.now() < finPaso) {
      // 1️⃣ Escribir PWM
      rpiplc.writePWM(canalPwm, pwmObjetivo);

      // 2️⃣ Leer ADC real (Silencioso)
      const conversion = await leerADC({
        canal: canalAdc,
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
        emitir: false
      });
      console.log("PWM objetivo:", pwmObjetivo);
      console.log("Valor ADC real:", conversion);
      // 3️⃣ Salida del modelo (simulada)
      const u = pwmObjetivo / 4095.0; // normalizar a [0,1]
      // console.log("PWM normalizado:", u);
      const y = modeloPlanta(u);
      const conversionSimulada = Math.round(y * 4095);
      console.log(`PWM: ${pwmObjetivo} | u: ${u.toFixed(4)} | y: ${y.toFixed(4)} | conversion: ${conversionSimulada}`);
      
      // 4️⃣ Calcular voltajes
      const voltaje0 = (MAX_VOLTAGE * conversion * ADC_CALIBRATION_FACTOR) / PWM_MAX; // medición real
      const voltaje1 = (MAX_VOLTAGE * y); // modelo simulado

      // 5️⃣ Construir dato completo
      const datoEnvio = {
        canal: "Comparacion",
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
        pwm: pwmObjetivo,
        voltaje0: parseFloat(voltaje0.toFixed(3)), // REAL
        voltaje1: parseFloat(voltaje1.toFixed(3)), // MODELO
      };

      // 6️⃣ Enviar por Socket y MQTT
      Sockets.enviarMensaje("comparacion", datoEnvio);
      publicarMQTT("Plc/Comparacion", JSON.stringify(datoEnvio));

      // 7️⃣ Guardar registro completo
      resultados.push(datoEnvio);

      // 7️⃣ Esperar siguiente muestreo
      tiempoTranscurrido += Ts;
      await new Promise((r) => setTimeout(r, tiempo_muestreo_ms));
    }
  }

  // 🧾 Resultado final
  return {
    Prueba: new Date().toISOString(),
    resultados,
  };
};
// =============================
// FUNCIÓN PRINCIPAL: CARACTERIZACIÓN
// =============================
const Caracterizacion = async ({params}) => {
  try {
    const N = parseInt(params.N || 1000);
    const canalPWM = parseInt(params.PwmPin || 0);
    const canalADC = parseInt(params.AdcPin || 0);
    const muestreo = parseInt(params.Ts || 50);
    const offset = parseFloat(params.Offset || 0.4);
    const amplitud = parseFloat(params.amplitud || 0.1);

    const duracion = N * muestreo;
    const Ts = muestreo / 1000;

    console.log("⚙️ Iniciando caracterización de planta:");
    console.log({
      N,
      canalPWM,
      canalADC,
      muestreo,
      offset,
      amplitud,
      duracion,
    });

    const resultado = [];
    let tiempo = 0;

    console.log("⏳ Esperando estabilización de la planta (5 s)...");
    await new Promise((r) => setTimeout(r, 5000));

    const inicio = Date.now();
    const fin = inicio + duracion;

    while (Date.now() < fin && resultado.length < N) {
      const signo = Math.random() < 0.5 ? -1 : 1;
      const duty = offset + amplitud * signo;

      // PWM 12 bits correcto (0–4095)
      const pwmValue = Math.round(duty * 4095);

      // Escribir PWM
      escribirPWM(canalPWM, pwmValue);

      // Leer ADC 0–4095
      const conversion = await leerADC({ canal: canalADC, tiempo });

      // Conversión con calibración correcta
      const voltaje = (MAX_VOLTAGE * conversion * ADC_CALIBRATION_FACTOR) / PWM_MAX;

      const muestra = {
        tiempo: parseFloat(tiempo.toFixed(3)),
        pwm: pwmValue,
        conversion,
        voltaje
      };

      resultado.push(muestra);

      if (typeof Sockets !== "undefined") {
        Sockets.enviarMensaje("caracterizacion", muestra);
      }

      tiempo += Ts;
      await new Promise((r) => setTimeout(r, muestreo));
    }

    console.log("✅ Caracterización completada. Muestras:", resultado.length);

    return {
      Prueba: new Date().toISOString(),
      resultado,
    };

  } catch (error) {
    console.error("❌ Error en caracterización:", error);
    throw error;
  }
};


// =======================
// Identificación de modelo
// =======================
const Identificacion = async ({ Ts, data }) => {
  try {
    const N = data.length;
    const muestreoMs = Ts * 1000; // en milisegundos
    console.log("⚙️ Iniciando identificación de planta en tiempo real:", { N, Ts, muestreoMs });

    const resultado = [];
    let tiempos = 0;

    // 🔁 Bucle en tiempo real: una muestra por iteración, con espera
    for (let i = 0; i < N; i++) {
      const { pwm,tiempo } = data[i];
      const u = pwm / 4095; // normalizar a [0,1]
//      console.log('pwm normalizado-pwm',u,pwm);
      const y = modeloPlanta(u); // salida normalizada  
      const conversion = Math.round(y * 4095); // escalar a 12 bits
      console.log(`PWM: ${pwm} | u: ${u.toFixed(4)} | y: ${y.toFixed(4)} | conversion: ${conversion}`);
      const muestra = {
        //tiempo: parseFloat(tiempo.toFixed(3)),
        tiempo,
        canal: 0,
        conversion,
        y,
      };

      // ✅ Emitir inmediatamente (como hacen las otras funciones)
      Sockets.enviarMensaje("adcPlc", muestra);
      // console.log(`📤 Enviada muestra ${i + 1}/${N}:`, muestra);

      // Guardar localmente también
      resultado.push(muestra);

      // Avanzar tiempo
      // Avanzar tiempo
      tiempos += Ts;
      // console.log("⏱️ Tiempo simulado:", tiempos.toFixed(6), "s");


      // ⏳ Esperar el tiempo de muestreo (solo si no es la última muestra)
      if (i < N - 1) {
        await new Promise((r) => setTimeout(r, muestreoMs));
      }
    }

    // console.log("✅ Identificación completada. Total muestras:", resultado.length);

    return {
      Fecha: new Date().toISOString(),
      resultado,
    };
  } catch (error) {
    console.error("❌ Error en identificación:", error);
    throw error;
  }
};
// =======================
// Exportación
// =======================
module.exports = {
  Identificacion,
  escribirSalida,
  leerEntrada,
  leerADC,
  ejecutarADC,
  escribirPWM,
  ejecutarControlPI,
  ejecutarCaracterizacion,
  Caracterizacion,
  Identificacion,
  ejecutarComparacion
};
