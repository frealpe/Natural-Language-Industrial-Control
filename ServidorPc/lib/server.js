const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const http = require('http');
const { dbConnection } = require('../database/config');
const { mqttClient } = require('../mqtt/conectMqtt'); 
const OpcServer = require('../services/OpcServer');
const OpcClient = require('../services/OpcClient'); // Cliente OPC mejorado
const { Server: SocketIOServer } = require('socket.io');
const Sockets = require('./socket');
// const { enviarComando } = require('../services/holonSupervisor');
const HolonSupervisor = require("../holon/HolonSupervisor");
const logger = require('./logger'); // 🟢 Nuevo Logger Interceptor
const supervisor = new HolonSupervisor();
class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;

        this.paths = {
            consulta: '/api/consulta',
            mqttallcomp: '/api/mqttallcomp',
        };

        this.middlewares();
        this.routes();
        this.initServices();        
        this.BrokerMqtt();

        // Crear servidor HTTP y Socket.IO
        this.server = http.createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: { origin: '*' }
        });

        // 🟢 Redirigir consola de ServidorPc al Frontend
        logger.onLog((logData) => {
             // logData = { type, msg, timestamp }
             // Agregamos topic 'ServidorPc' para que el frontend ponga el badge correcto
             this.io.emit('serverLog', { topic: 'ServidorPc', ...logData });
        });

        this.configurarSockets();
    }

    async initServices() { 
        // Iniciar servidor OPC UA
        this.opcServer = new OpcServer();
        await this.opcServer.start();
        const endpointUrl = this.opcServer.server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        // console.log("Servidor OPC UA corriendo en:", endpointUrl);

        // Iniciar lectura continua
        // this.startOpcReading();

        try {
            // Iniciar cliente OPC UA
             this.opcClient = new OpcClient();
             await this.opcClient.connect(endpointUrl);
             
             // Iniciar lectura continua
             this.startOpcReading();
        } catch (error) {
            console.warn("⚠️ No se pudo conectar al PLC via OPC UA (¿Está encendida la Raspberry Pi?). El servidor continuará sin OPC.");
            // console.error(error.message);
        }
    } 

    async startOpcReading() {
        if (!this.opcClient) return;

        const nodoADC = "ns=1;s=ADC";

        const callback = (valor) => {
        };

        await this.opcClient.subscribe(nodoADC, callback, 500);
    }

    async conectarDB() {
        await dbConnection();
        console.log('Base de datos conectada');
    }

BrokerMqtt() {
  // this.ejecutarHolones(); 
  mqttClient.on('message', (topic, message) => {
    try {
      // Convertir el buffer recibido a string
      const msgString = message.toString();

      // Inicializar msgJSON como null
      let msgJSON = null;
 
      // Intentar parsear el mensaje como JSON
      try {
        msgJSON = JSON.parse(msgString);
      } catch (err) {
        console.warn('⚠️ Mensaje no es JSON válido, se enviará como texto.');
        msgJSON = { raw: msgString };
      }

      // Manejo específico para el topic Plc/Respuesta
      if (topic === 'Plc/Respuesta') {
        // console.log('📩 Recibido Plc/Respuesta:', msgJSON);

        // Reenviar a todos los clientes WebSocket (como JSON)
        if (this.io) {
          this.io.emit('respuestaPlc', msgJSON);

          // 🟢 LOG AUTOMÁTICO DE IDENTIFICACIÓN
          if (msgJSON.tipo === 'Identificacion' && msgJSON.ok) {
              const metodoStr = msgJSON.metodo ? ` [Método: ${msgJSON.metodo}]` : '';
              // Mostrar MSE (Varianza aproximada del error) en lugar de FIT si se prefiere
              const metrica = msgJSON.mse ? `MSE: ${Number(msgJSON.mse).toExponential(3)}` : `FIT: ${msgJSON.fit}%`;
              let logMsg = `✅ Modelo Identificado (ARX ${msgJSON.orden} - ${metrica})${metodoStr}:\n${msgJSON.ecuacion || 'Ecuación no disponible'}`;
              
              if (msgJSON.analisisIA) {
                  // Format analysis object if it's an object, or just string if it's a string
                  const analisisStr = typeof msgJSON.analisisIA === 'object' 
                      ? (msgJSON.analisisIA.analisis || JSON.stringify(msgJSON.analisisIA)) 
                      : msgJSON.analisisIA;
                  logMsg += `\n\n🧠 Análisis IA: ${analisisStr}`;
              }

              this.io.emit('serverLog', {
                  topic: 'Plc/Identificacion',
                  msg: logMsg,
                  type: 'info',
                  timestamp: Date.now()
              });
          }
        }
      }

      // 📋 Manejo de Logs Globales (Logs, Identificación, etc.)
      const topicsToLog = ['Plc/Logs', 'Plc/Identificacion', 'Plc/ControlIA'];
      if (topicsToLog.includes(topic)) {
          if (this.io) {
              const logPayload = { 
                  topic, 
                  timestamp: Date.now(),
                  ...((typeof msgJSON === 'object' && msgJSON !== null) ? msgJSON : { msg: msgJSON }) 
              };
              this.io.emit('serverLog', logPayload);
          }
      }
 

    } catch (error) {
      console.error('❌ Error al procesar mensaje MQTT:', error);
    }
  });
}



   ejecutarHolones() {

  // supervisor.enviarComando("SdeO", { id_orden: "MIS-TEST", tarea_requerida: "Pulido" });
  // supervisor.solicitarOfertas();

   } 


    middlewares() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        this.app.use(fileUpload({
            useTempFiles: true,
            tempFileDir: '/tmp/',
            createParentPath: true
        }));
    }

        configurarSockets() {
        this.sockets = new Sockets(this.io);
        this.app.locals.sockets = this.sockets;
        }
    routes() {
        this.app.use(this.paths.consulta, require('../routers/consulta'));
        this.app.use(this.paths.mqttallcomp, require('../routers/mqttallcomp'));
    }

    listen() {
        this.server.listen(this.port, () => {
            console.log('Servidor corriendo en puerto', this.port);
        });
    }
}

module.exports = Server;
