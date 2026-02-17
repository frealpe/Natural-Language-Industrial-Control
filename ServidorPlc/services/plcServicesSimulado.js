// =======================
// Escritura digital

const Sockets = require("../lib/socket");
const { modeloPlanta } = require("./modelo");
//{modeloPlanta} = require("../services/modelo");
//const { modeloPlanta } = require("../services/modelo");

// =======================
const escribirSalida = ({ pin, valor }) => {
  if (pin !== undefined && (valor === 0 || valor === 1)) {
    // Simulación: randomiza si la escritura fue "exitosa" o no
    const simulated = Math.random() > 0.1; // 90% éxito, 10% fallo
    if (simulated) {
      console.log(`✅ (Simulado) Salida ${pin} configurada en ${valor}`);
      return `✅ (Simulado) Salida ${pin} configurada en ${valor}`;
    } else {
      console.log(`⚠️ (Simulado) Error al configurar salida ${pin}`);
      return `⚠️ (Simulado) Error al configurar salida ${pin}`;
    }
  }
  return `⚠️ Pin ${pin} no definido o valor inválido`;
};
// =======================
// Lectura digital
// =======================
const leerEntrada = (pin) => {
  if (pin !== undefined) {
    // Simulación: genera 0 o 1 de forma aleatoria
    const valor = Math.random() > 0.5 ? 1 : 0;
    console.log(`(Simulado) Entrada ${pin} leída: ${valor}`);
    return valor;
  }
  return `⚠️ Pin ${pin} no definido en la tabla`;
};

// =======================
// Lectura de ADC
// =======================
const leerADC = async ({ canal, tiempo }) => {
  //console.log("Canal:", canal);

  if (canal !== undefined) {
    // Simulación: valor ADC aleatorio entre 0 y 4095 (12 bits)
    const conversion = Math.floor(Math.random() * 4096);
    // console.log("Conversion",conversion);
    // Emitir al cliente WebSocket
    Sockets.enviarMensaje("adcPlc", { canal, conversion, tiempo });

    return conversion;
  }

  return null;
};

// =======================
// Lectura periódica de ADC
// =======================
const ejecutarADC = async ({ canal, muestreo, duracion }) => {
  // console.log("⚙️ Ejecutando ADC...");
  // console.log(`➡️ canal=${canal}, muestreo=${muestreo}ms, duracion=${duracion}ms`);

  const fin = Date.now() + duracion;
  const resultados = [];
  const Ts = muestreo / 1000; // segundos
  let tiempoTranscurrido = 0;

  while (Date.now() < fin) {
    // Calcular tiempo actual
    const tiempoActual = parseFloat(tiempoTranscurrido.toFixed(2));
    //console.log("⏲️ Tiempo actual:", tiempoActual);

    // Llamar al ADC
    const conversion = await leerADC({ canal, tiempo: tiempoActual });
    //console.log("🔹 Valor ADC:", valor);

    resultados.push({
      canal,
      tiempo: tiempoActual,
      conversion,
    });

    tiempoTranscurrido += Ts;
    // console.log("🧭 Tiempo transcurrido:", tiempoTranscurrido);

    await new Promise((r) => setTimeout(r, muestreo));
  }

  // console.log("✅ Finalizado. Total muestras:", resultados.length);
  return resultados;
};

// =======================
// Escritura de PWM
// =======================
const escribirPWM = (canal, duty) => {
  if (canal !== undefined && duty >= 0 && duty <= 4095) {
    const simulatedDuty = Math.floor(Math.random() * 4096);
    return simulatedDuty;
  }
  return `⚠️ Canal PWM ${canal} no definido o duty inválido`;
};

// =======================
// Control PI discreto (simulación real 12-bit PWM)
// =======================
const ejecutarControlPI = async ({
  canalAdc,
  canalPwm,
  setpoint_volt,
  tiempo_muestreo_ms,
  tiempo_simulacion_ms,
}) => {
  console.log(
    `📡 Iniciando Control PI: ADC${canalAdc} → PWM${canalPwm}, SetPoint=${setpoint_volt}V, Ts=${tiempo_muestreo_ms}ms, Duración=${tiempo_simulacion_ms}ms`
  );

  let integralError = 0.0;
  const kp = 1.2;
  const Ti = 0.5049;
  const Ts = tiempo_muestreo_ms / 1000; // tiempo de muestreo en segundos
  const fin = Date.now() + tiempo_simulacion_ms;
  let tiempoTranscurrido = 0;

  const resultados = []; // aquí guardamos los JSON de cada iteración

  while (Date.now() < fin) {
    // 1️⃣ Leer ADC
    const conversion = await leerADC({
      canal: canalAdc,
      tiempo: tiempoTranscurrido,
    });

    if (conversion < 0) conversion = 0;

    // 2️⃣ Convertir a voltaje 0–10V
    const voltaje = (10.0 * conversion) / 4095;

    // 3️⃣ Calcular error PI
    const error = setpoint_volt - voltaje;
    integralError += Ts * error;
    let controlVoltage = kp * (error + (1.0 / Ti) * integralError);

    // 4️⃣ Limitar salida PI entre 0 y 10V
    controlVoltage = Math.min(Math.max(controlVoltage, 0), 10);

    // 5️⃣ Escalar control a PWM 12-bit
    const valorPWM = Math.round((controlVoltage / 10) * 4095);
    escribirPWM({ canalPwm, valorPWM });

    // Crear JSON con la info
    const dato = {
      tiempo: tiempoTranscurrido.toFixed(2),
      voltaje,
      pwm: valorPWM,
    };

    resultados.push(dato); // guardar en el array

    tiempoTranscurrido += Ts;
    await new Promise((r) => setTimeout(r, tiempo_muestreo_ms));
  }

  // 👇 Estructura final
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

  console.log(`⚙️ Iniciando caracterización secuencial PWM-ADC...`);

  for (const paso of secuencia) {
    const pwmObjetivo = Math.round((paso.porcentaje / 100) * 4095);
    const duracionPasoMs = paso.duracion_s * 1000;
    const inicioPaso = Date.now();
    const finPaso = inicioPaso + duracionPasoMs;

    console.log(
      `➡️ Nivel ${paso.porcentaje}% (${pwmObjetivo}) durante ${paso.duracion_s}s`
    );

    // Mantiene el PWM constante en este nivel durante la duración especificada
    while (Date.now() < finPaso) {
      // 1️⃣ Escribir PWM
      escribirPWM(canalPwm, pwmObjetivo);

      // 2️⃣ Leer ADC
      const conversion = await leerADC({
        canal: canalAdc,
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
      });

      // 3️⃣ Escalar ADC a voltaje (0–10 V)
      const voltaje = (10.0 * conversion) / 4095.0;

      // 4️⃣ Guardar registro
      resultados.push({
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
        pwm: pwmObjetivo,
        adc: conversion,
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
  tiempo_muestreo_ms = 100,
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
    const pwmObjetivo = Math.round((paso.porcentaje / 100) * 4095);
    const duracionPasoMs = paso.duracion_s * 1000;
    const inicioPaso = Date.now();
    const finPaso = inicioPaso + duracionPasoMs;

    while (Date.now() < finPaso) {
      // 1️⃣ Escribir PWM
      //rpiplc.writePWM(canalPwm, pwmObjetivo);

      // 2️⃣ Leer ADC real
      const conversion = await leerADC({
        canal: canalAdc,
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
      });
      console.log("PWM objetivo:", pwmObjetivo);
      console.log("Valor ADC real:", conversion);
      // 3️⃣ Salida del modelo (simulada)
      const y = Math.round(modeloPlanta(pwmObjetivo));
      console.log("Valor modelo simulado:", y);
      // 4️⃣ Enviar salida simulada por socket
      Sockets.enviarMensaje("adcPlc", {
        canal: 1,
        conversion: y,
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
      });

      // 5️⃣ Escalar ambos a voltaje (0–10 V)
      const voltaje0 = (10.0 * conversion) / 4095.0; // medición real
      const voltaje1 = (10.0 * y) / 4095.0; // modelo simulado

      // 6️⃣ Guardar registro completo
      resultados.push({
        tiempo: parseFloat(tiempoTranscurrido.toFixed(3)),
        pwm: pwmObjetivo,
        voltaje0: parseFloat(voltaje0.toFixed(3)), // real
        voltaje1: parseFloat(voltaje1.toFixed(3)), // modelo
      });

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

// =======================
const Caracterizacion = async ({ params }) => {
  try {
    // --- Validación y conversión ---
    const N = parseInt(params.N || 1000);
    const canalPWM = parseInt(params.PwmPin || 0);
    const canalADC = parseInt(params.AdcPin || 0);
    const muestreo = parseInt(params.Ts || 50); // en ms
    const offset = parseFloat(params.Offset || 0.5);
    const amplitud = parseFloat(params.amplitud || 0.1);
    // Configuración fija o ajustable
    //const amplitud = 0.1; // ±10%
    const duracion = N * muestreo; // duración total ≈ N muestras * Ts
    const Ts = muestreo / 1000; // segundos

    console.log("⚙️ Iniciando caracterizacion de planta:");
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

    // 🔸 Espera inicial (similar al delay(5000) en Arduino)
    // console.log("⏳ Esperando estabilización de la planta (5 s)...");
    // await new Promise((r) => setTimeout(r, 5000));

    const inicio = Date.now();
    const fin = inicio + duracion;

    // 🔹 Bucle principal de muestreo
    while (Date.now() < fin && resultado.length < N) {
      const signo = Math.random() < 0.5 ? -1 : 1;
      const duty = offset + amplitud * signo;
      const pwmValue = Math.round(duty * 4095);

      // Escribir PWM
      escribirPWM(canalPWM, pwmValue);

      // Leer ADC
      const conversion = await leerADC({ canal: canalADC, tiempo });
      const voltaje = (10.0 * conversion) / 4095.0;

      // Registrar muestra
      const muestra = {
        tiempo: parseFloat(tiempo.toFixed(3)),
        pwm: pwmValue,
        conversion,
        voltaje
      };

      resultado.push(muestra);

      // Enviar por socket (si aplica)
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
// Identifcicación de modelo
// =======================
const Identificacion = async ({ Ts, data }) => {
  try {
    const N = data.length;
    const muestreoMs = Ts * 1000; // en milisegundos
    console.log("⚙️ Iniciando identificación de planta en tiempo real:", {
      N,
      Ts,
      muestreoMs,
    });

    const resultado = [];
    let tiempo = 0;

    // 🔁 Bucle en tiempo real: una muestra por iteración, con espera
    for (let i = 0; i < N; i++) {
      const { pwm } = data[i];
      const u = pwm / 4095; // normalizar a [0,1]
      const y = modeloPlanta(u);
      const conversion = Math.round(y * 4095); // escalar a 12 bits

      const muestra = {
        tiempo: parseFloat(tiempo.toFixed(3)),
        canal: 0,
        conversion,
        y,
      };

      // ✅ Emitir inmediatamente (como hacen las otras funciones)
      Sockets.enviarMensaje("adcPlc", muestra);
      console.log(`📤 Enviada muestra ${i + 1}/${N}:`, muestra);

      // Guardar localmente también
      resultado.push(muestra);

      // Avanzar tiempo
      tiempo += Ts;

      // ⏳ Esperar el tiempo de muestreo (solo si no es la última muestra)
      if (i < N - 1) {
        await new Promise((r) => setTimeout(r, muestreoMs));
      }
    }

    console.log(
      "✅ Identificación completada. Total muestras:",
      resultado.length
    );

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
  escribirSalida,
  leerEntrada,
  leerADC,
  ejecutarADC,
  escribirPWM,
  ejecutarControlPI,
  ejecutarCaracterizacion,
  Caracterizacion,
  Identificacion,
  ejecutarComparacion,
};
