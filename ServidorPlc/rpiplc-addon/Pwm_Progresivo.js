const rpiPLC = require('./build/Release/rpiplc');

const canalPWM = 0;        // Canal PWM
const intervaloMs = 50;    // Tiempo entre pasos (ajústalo)
const paso = 50;           // Incremento del PWM en cada ciclo
let pwmValue = 1;          // Valor inicial

console.log(`📡 Generando rampa PWM en canal ${canalPWM} (1–4095)`);

const loopPWM = () => {
    try {
        // Escribir PWM
        rpiPLC.writePWM(canalPWM, pwmValue);

        console.log(`PWM${canalPWM} = ${pwmValue}`);

        // Incrementar valor
        pwmValue += paso;

        // Reiniciar si pasa de 4095
        if (pwmValue > 4095) pwmValue = 1;
    } catch (err) {
        console.error("❌ Error en PWM:", err);
    }
};

const intervalId = setInterval(loopPWM, intervaloMs);

// Manejo de apagado seguro
const shutdown = () => {
    console.log("\n⚡ Apagando PWM y saliendo...");
    try { rpiPLC.writePWM(canalPWM, 1); } catch (err) { console.error(err); }
    clearInterval(intervalId);
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

