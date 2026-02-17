const rpiplc = require('./build/Release/rpiplc');

// ------------------------------
// Configuración
// ------------------------------
const canalADC = 0;   
const canalPWM = 0;   
const Ts = 0.1;             // 100 ms
const setPointVolts = 2.5;  // Consigna 5 V

// Parámetros PI
const Kp = 1.2;
const Ti = 0.5049;

// Estado
let integralError = 0.0;

function piController(error) {
  // Propuesta de control (antes de saturar)
  let u = Kp * (error + (integralError / Ti));

  // Saturación
  if (u > 10.0) u = 10.0;
  if (u < 0.0) u = 0.0;

  // Anti-windup: solo integro si no está saturado
  if (u > 0.0 && u < 10.0) {
    integralError += Ts * error;
  }

  return u;
}

// ------------------------------
// Bucle principal
// ------------------------------
console.log(`📡 Control PI con anti-windup (ADC${canalADC} → PWM${canalPWM})`);

setInterval(() => {
  let raw = rpiplc.readADC(canalADC); 
  if (raw < 0) raw = 0;

  // Escalar a voltaje
  const voltage = 10.0 * raw / 4095.0;

  // Error respecto a referencia
  const error = setPointVolts - voltage;

  // Señal de control
  const controlVolts = piController(error);

  // Convertir a 12 bits (0–4095)
  const pwmValue = Math.round((controlVolts * 4095.0) / 10.0);

  rpiplc.writePWM(canalPWM, pwmValue);    

  console.log(
    `ADC=${raw} (${voltage.toFixed(3)} V) | Error=${error.toFixed(3)} | Control=${controlVolts.toFixed(3)} V | PWM=${pwmValue}`
  );
}, Ts * 1000);

