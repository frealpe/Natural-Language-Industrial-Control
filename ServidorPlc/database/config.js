const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DBNAME,
  ssl: { rejectUnauthorized: false },
  // 🛡️ Configuración de robustez
  max: 10,                  // Máximo de conexiones simultáneas
  idleTimeoutMillis: 30000, // Cerrar clientes inactivos tras 30s
  connectionTimeoutMillis: 5000, // Timeout para conectar
});

// Manejo de errores globales del pool (evita crash por desconexión idle)
pool.on('error', (err, client) => {
  console.error('⚠️ [PostgreSQL] Error inesperado en cliente inactivo:', err);
  // process.exit(-1); // NO salir, dejar que se recupere
});

pool.connect()
  .then(client => {
    console.log("📦 Base de datos PostgreSQL en línea (Plc)");
    client.release();
  })
  .catch(err => {
    console.error("❌ Error inicial de conexión a BD:", err);
  });

module.exports = pool; // exportamos el pool directamente
