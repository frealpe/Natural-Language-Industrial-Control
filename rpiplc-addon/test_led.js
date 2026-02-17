const plc = require('./build/Release/rpiplc');

const Q0_0_PIN = 20971532; // Reemplaza por el valor correcto de tu common.h / pins_reference.h

console.log("Encendiendo Q0.0...");
plc.writeDigital(Q0_0_PIN, 1);
setTimeout(() => {
    console.log("Apagando Q0.0...");
    plc.writeDigital(Q0_0_PIN, 0);
}, 2000);
