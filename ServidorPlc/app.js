// const { append } = require("express/lib/response");

// CRÍTICO: Configurar dotenv-expand PRIMERO, antes de importar cualquier otro módulo
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

// Ahora sí, importar Server
require("./lib/mqttLogger"); // 🟢 Interceptar logs
const Server = require("./lib/server");
 
const server = new Server();
server.listen();
