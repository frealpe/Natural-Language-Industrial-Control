const OpcClient = require('../services/OpcClient');
const { mqttClient } = require('../mqtt/conectMqtt'); // Asegúrate de importar tu cliente MQTT
 
const initOpcClient = async () => {
    try {
        console.log("Iniciando cliente OPC UA...");
        const opcClient = new OpcClient();

        const endpointUrl = process.env.OPC_ENDPOINT;
        console.log("Conectando a:", endpointUrl);

        await opcClient.connect(endpointUrl);
        console.log("✅ Cliente OPC UA conectado");

        // Iniciar lectura continua
        await startOpcReading(opcClient);

        return opcClient;
    } catch (err) {
        console.error("❌ Error inicializando OPC UA en Raspberry:", err);
        throw err;
    }
};

const startOpcReading = async (opcClient) => { 
    if (!opcClient) return;

    // Nodo que quieres leer
    const nodoADC = "ns=1;s=ADC";
   
    // Callback que se ejecuta cada vez que cambia el valor
    const callback = (valor) => {
        console.log("Valor ADC recibido:", valor);

        // Publicar en MQTT
        mqttClient.publish("Plc/Result", valor.toString(), { qos: 0 }, (err) => {
            if (err) console.error("Error publicando ADC en MQTT:", err);
        });
    };

    // Crear suscripción cada 500ms
    await opcClient.subscribe(nodoADC, callback, 500);
};

module.exports = { initOpcClient };
