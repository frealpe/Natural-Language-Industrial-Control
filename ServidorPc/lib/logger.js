const util = require('util');

const methods = ['log', 'error', 'warn', 'info'];
const originalMethods = {};
const callbacks = [];

// 1. Guardar métodos originales
methods.forEach(method => {
    originalMethods[method] = console[method];
});

// 2. Función de intercepción
function intercept(type, args) {
    // a. Ejecutar original (para ver en terminal del servidor)
    if (originalMethods[type]) {
        originalMethods[type].apply(console, args);
    }

    // b. Formatear mensaje
    const msg = util.format(...args);
    const timestamp = Date.now();

    // c. Notificar a listeners (Socket.IO)
    callbacks.forEach(cb => cb({ type, msg, timestamp }));
}

// 3. Sobrescribir consola
methods.forEach(method => {
    console[method] = function (...args) {
        intercept(method, args);
    };
});

// 4. Método para registrar listeners (ej: Socket.IO)
function onLog(callback) {
    callbacks.push(callback);
}

module.exports = { onLog };
