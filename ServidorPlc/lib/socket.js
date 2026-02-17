// socket.js
const { io } = require('socket.io-client');

class Sockets {
    constructor() {
        const serverUrl = process.env.SOCKET_SERVER_URL;
        console.log(`🔗 Conectando a servidor Socket.IO: ${serverUrl}`);
        
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 5000, 
        });

        this.configurarEventos();
    }

    configurarEventos() {
        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor Socket.IO:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('⚠️ Desconectado del servidor Socket.IO');
        });

        this.socket.on('respuestaPLC', (msg) => {
            console.log('📩 Mensaje recibido del servidor:', msg);
        });
    }

    enviarMensaje(evento, data) {
        //console.log(data)
        this.socket.emit(evento, data);
    }
}

module.exports = new Sockets(); // Exportamos una instancia lista
