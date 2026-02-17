const rpiPLC = require('./build/Release/rpiplc');

const canalADC = 0;   // primer canal ADC
const canalPWM = 0;   // primer canal PWM
const intervalMs = 500;

console.log(`📡 Usando ADC${canalADC} como entrada y PWM${canalPWM} como salida (12 bits)`);

const loopPWM = () => {
    try {
        // Leer ADC (0–4095, 12 bits)
        const value = rpiPLC.readADC(canalADC);

        // Escalar a 8 bits (0–255) si tu PWM es de 8 bits
        const pwmValue = Math.floor((value * 4095) / 4095);

        // Escribir en PWM
        rpiPLC.writePWM(canalPWM, pwmValue);

        console.log(`ADC${canalADC} = ${value} -> PWM${canalPWM} = ${pwmValue}`);
    } catch (err) {
        console.error("❌ Error en lectura/escritura:", err);
    }
};

const intervalId = setInterval(loopPWM, intervalMs);

// Manejo de apagado seguro
const shutdown = () => {
    console.log("\n⚡ Apagando PWM y saliendo...");
    try { rpiPLC.writePWM(canalPWM, 0); } catch (err) { console.error(err); }
    clearInterval(intervalId);
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

