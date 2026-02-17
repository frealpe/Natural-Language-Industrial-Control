const { OPCUAClient, AttributeIds, TimestampsToReturn, ClientSubscription, ClientMonitoredItem } = require("node-opcua");

class OpcClient {
    constructor() {
        this.client = OPCUAClient.create({
            endpointMustExist: false,
            connectionStrategy: { initialDelay: 1000, maxRetry: 10 },
        });
        this.session = null;
        this.subscription = null;
    }

        async connect(endpointUrl) {
            await this.client.connect(endpointUrl);
            this.session = await this.client.createSession();
            console.log("Cliente OPC UA conectado");

            // Crear suscripción para mantener la conexión viva
            this.subscription = ClientSubscription.create(this.session, {
                requestedPublishingInterval: 500, // ms
                requestedLifetimeCount: 10000,
                requestedMaxKeepAliveCount: 10,
                maxNotificationsPerPublish: 100,
                publishingEnabled: true,
                priority: 10
            });

            this.subscription.on("keepalive", () => {}
                //console.log("Suscripción Cliente Opc Activa")
            
        );
            this.subscription.on("terminated", () => {} //console.log("Suscripción terminada")
            
        );
        }



    async subscribe(nodeId, callback) {
        if (!this.subscription) return;

        const monitoredItem = ClientMonitoredItem.create(
            this.subscription,
            { nodeId, attributeId: AttributeIds.Value },
            { samplingInterval: 500, discardOldest: true, queueSize: 10 },
            TimestampsToReturn.Both
        );

        monitoredItem.on("changed", (dataValue) => {
            callback(dataValue.value.value);
        });
    }

    async ensureConnection() {
        if (!this.session) {
            console.log("Sesión OPC UA no activa. Reconectando...");
            if (this.endpointUrl) {
                await this.connect(this.endpointUrl);
            } else {
                throw new Error("No hay endpoint definido para reconectar OPC UA");
            }
        }
    }

    async readVariable(nodeId) {
        await this.ensureConnection();
        try {
            const dataValue = await this.session.read({
                nodeId,
                attributeId: AttributeIds.Value
            });
            return dataValue.value.value;
        } catch (err) {
            console.error(`Error leyendo variable ${nodeId}:`, err.message);
            return null;
        }
    }

    async writeVariable(nodeId, value, dataType = DataType.Double) {
        await this.ensureConnection();
        try {
            await this.session.write({
                nodeId,
                attributeId: AttributeIds.Value,
                value: {
                    value: {
                        dataType,
                        value
                    }
                }
            });
            console.log(`Valor escrito en ${nodeId}:`, value);
        } catch (err) {
            console.error(`Error escribiendo variable ${nodeId}:`, err.message);
        }
    }

    async disconnect() {
        try {
            if (this.session) {
                await this.session.close();
                this.session = null;
            }
            await this.client.disconnect();
            console.log("⚡ Cliente OPC UA desconectado");
        } catch (err) {
            console.error("Error desconectando OPC UA:", err.message);
        }
    }
}

module.exports = OpcClient;
