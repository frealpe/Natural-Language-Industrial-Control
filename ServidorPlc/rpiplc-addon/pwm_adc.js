const rpiplc = require('./build/Release/rpiplc'); // Ajusta ruta si es diferente

const canalADC = 0;   // Canal ADC que quieres leer
const canalPWM = 0;   // Canal PWM a controlar
const duracionSegundos = 20;
const intervaloMs = 100;

let tiempoTranscurrido = 0;

console.log(`📡 Leyendo ADC${canalADC} y escribiendo en PWM${canalPWM} (12-bit) durante ${duracionSegundos} segundos...`);

const interval = setInterval(() => {
    let valorADC = rpiplc.readADC(canalADC); // Leer ADC 12-bit (0-4095)

    if (valorADC < 0) {
        console.log('Error leyendo ADC. Revisa conexiones.');
        valorADC = 0;
    }

    // Directamente pasar el valor del ADC al PWM (12-bit)
    const valorPWM = valorADC;

    // Escribir PWM
    rpiplc.writePWM(canalPWM, valorPWM);

    console.log(`t=${tiempoTranscurrido.toFixed(2)}s | ADC${canalADC}=${valorADC} -> PWM${canalPWM}=${valorPWM}`);

    tiempoTranscurrido += intervaloMs / 1000;

    if (tiempoTranscurrido >= duracionSegundos) {
        clearInterval(interval);
        console.log('✅ Proceso finalizado.');
    }
}, intervaloMs);
