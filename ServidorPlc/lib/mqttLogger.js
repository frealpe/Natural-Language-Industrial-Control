const { publicarMQTT } = require('../mqtt/conectMqtt');
const util = require('util');

const methods = ['log', 'error', 'warn', 'info', 'debug'];
const originalMethods = {};

// 1. Guardar métodos originales
methods.forEach(method => {
    originalMethods[method] = console[method];
});

// 2. Función genérica de intercepción
function intercept(type, args) {
    try {
        // Imprimir en terminal usando los métodos originales (para no romper stdout)
        if (originalMethods[type]) {
            originalMethods[type].apply(console, args);
        }

        // Formatear mensaje
        const msg = util.format(...args);

        // Enviar a MQTT
        // Mapeamos 'warn' -> 'error' visualmente si queremos, o mantenemos el tipo.
        // En frontend: type === 'error' ? ROJO : VERDE. 'warn' podría ser AMARILLO.
        publicarMQTT('Plc/Logs', JSON.stringify({ 
            type: type, 
            msg: msg, 
            timestamp: Date.now() 
        }));
    } catch (e) {
        process.stderr.write(`❌ Error en mqttLogger: ${e.message}\n`);
    }
}

// 3. Sobrescribir consola
methods.forEach(method => {
    console[method] = function (...args) {
        intercept(method, args);
    };
});

// 4. Capturar errores no manejados del proceso
process.on('uncaughtException', (err) => {
    const msg = `🔥 Uncaught Exception: ${err.message}\n${err.stack}`;
    process.stderr.write(msg + '\n');
    publicarMQTT('Plc/Logs', JSON.stringify({ type: 'error', msg, timestamp: Date.now() }));
    // No salimos (exit) forzosamente para intentar mantener vivo el PLC, o sí? 
    // Mejor dejar que pm2 reinicie si es crítico, pero reportamos antes.
});

process.on('unhandledRejection', (reason, promise) => {
    const msg = `⚠️ Unhandled Rejection: ${util.format(reason)}`;
    process.stderr.write(msg + '\n');
    publicarMQTT('Plc/Logs', JSON.stringify({ type: 'error', msg, timestamp: Date.now() }));
});

module.exports = {
    originalMethods
};
