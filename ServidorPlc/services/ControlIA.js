const rpiplc = require("../rpiplc-addon/build/Release/rpiplc");
const Sockets = require("../lib/socket");

async function ejecutarControlIA({
  canalAdc,
  canalPwm,
  setpoint_volt,
  tiempo_muestreo_ms,
  tiempo_simulacion_ms,
  perturbacion_volt,
  tiempo_perturbacion_ms,
  controlIA
}) {
  // Parámetros de sintonización
  const Kp = 1.1000;
  const Ki = 1.2445;
  const Ti = 0.8839;
  const Ts = 0.05; // seg
  const alpha = 2;

  const maxVolt = 8.8;
  const maxAdc = 4095;

  let u = 0;       // Acción de control actual (voltios)
  let u_ant = 0;   // Acción de control anterior (voltios)
  let e = 0;       // Error actual
  let e_ant = 0;   // Error anterior

  const resultados = [];

  const startTime = Date.now();

  // Función para convertir ADC a voltaje
  function adcToVolt(adc) {
    return (adc / maxAdc) * maxVolt;
  }

  // Función para saturar valor entre min y max
  function saturar(valor, min, max) {
    return valor < min ? min : valor > max ? max : valor;
  }

  // Cantidad de iteraciones según tiempo de simulación y muestreo
  const iteraciones = Math.floor(tiempo_simulacion_ms / tiempo_muestreo_ms);

  for (let i = 0; i <= iteraciones; i++) {
    const tiempo = Date.now() - startTime;

    // Leer ADC y convertir a voltaje
    const adcRaw = rpiplc.readADC(canalAdc);
    const voltaje = adcToVolt(adcRaw);

    // Calcular error
    e = setpoint_volt - voltaje;

    // Calcular acción de control PI discreto con anti-windup
    // u = u_ant + Kp*(e - e_ant) + Ki*Ts*e
    let u_calculado = u_ant + Kp * (e - e_ant) + Ki * Ts * e;

    // Inyección de perturbación si tiempo >= tiempo_perturbacion_ms
    let u_perturbado = u_calculado; // Por defecto sigue el control normal
    let perturbacionActiva = false;

    // Aplicar perturbación si existe un voltaje de perturbación definido
    if (typeof perturbacion_volt === 'number' && perturbacion_volt !== 0) {
      perturbacionActiva = tiempo >= (tiempo_perturbacion_ms || 0);
      u_perturbado = u_calculado + (perturbacionActiva ? perturbacion_volt : 0);
      if (perturbacionActiva) {
         console.log(`⚠️ Disturbio ACTIVADO: ${perturbacion_volt}V`);
      }
    }

    // Saturar la acción de control entre 0 y 8.8V
    let u_final = saturar(u_perturbado, 0, maxVolt);

    // Anti-windup: ajustar u_calculado para evitar acumulación fuera de rango
    // Si u_final está saturado, no actualizar u_ant con u_calculado sino con u_final
    // Esto evita que el integrador siga acumulando error cuando la salida está saturada
    if (u_perturbado !== u_final) {
      // Salida saturada, corregir u_calculado para la próxima iteración
      u_calculado = u_final;
    }

    // Convertir u_final a valor PWM (0-4095)
    const pwm_val = Math.round((u_final / maxVolt) * maxAdc);

    // Escribir PWM
    rpiplc.writePWM(canalPwm, pwm_val);

    // Enviar datos por socket
    Sockets.enviarMensaje("adcPlc", {
      tiempo,
      voltaje,
      pwm: pwm_val,
      error: e,
      u: u_final,
      perturbacion: perturbacionActiva
    });

    // Guardar resultados
    resultados.push({
      tiempo,
      voltaje,
      pwm: pwm_val,
      error: e,
      u: u_final,
      perturbacion: perturbacionActiva
    });

    // Actualizar variables para siguiente iteración
    u_ant = u_calculado;
    e_ant = e;

    // Esperar tiempo de muestreo
    if (i < iteraciones) {
      await new Promise(resolve => setTimeout(resolve, tiempo_muestreo_ms));
    }
  }

  return {
    Prueba: new Date().toISOString(),
    parametros: {
      Kp,
      Ki,
      Ti,
      alpha,
      setpoint_volt,
      Ts,
      perturbacion_volt
    },
    resultados
  };
}

module.exports = { ejecutarControlIA };