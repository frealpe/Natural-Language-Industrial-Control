const { dbConnection } = require("../database/config");
const { gtpServiceUniversal } = require("../services/gtpServices");

const consultaIA = async (req, res) => {
  try {
    const { prompt } = req.body;

    // 1️⃣ Generar la consulta SQL con GPT
    const comandos = await gtpServiceUniversal(prompt);
    console.log("🧠 Consulta SQL generada por IA:", comandos);
    const pool = dbConnection();
    const result = await pool.query(comandos);

    // 2️⃣ Retornar solo "rows"
    res.json(result.rows);

  } catch (error) {
    console.error("❌ Error en consultaIA:", error);
    res.status(500).json({ error: "Error al ejecutar la consulta SQL" });
  }
};

const getAllData = async (req, res) => {
  try {
    const pool = dbConnection();
    
    // Ejecutar consultas en paralelo
    const [dataloggerResult, caracterizacionResult, comparacionResult] = await Promise.all([
      pool.query("SELECT * FROM datalogger ORDER BY id DESC"),
      pool.query("SELECT * FROM caracterizacion ORDER BY id DESC"),
      pool.query("SELECT * FROM comparacion ORDER BY id DESC")
    ]);

    res.json({
      datalogger: dataloggerResult.rows,
      caracterizacion: caracterizacionResult.rows,
      comparacion: comparacionResult.rows
    });

  } catch (error) {
    console.error("❌ Error en getAllData:", error);
    res.status(500).json({ error: "Error al obtener todos los datos" });
  }
};

const deleteDatalogger = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = dbConnection();
    await pool.query("DELETE FROM datalogger WHERE id = $1", [id]);
    res.json({ msg: `Registro Datalogger ${id} eliminado` });
  } catch (error) {
    console.error("❌ Error al eliminar datalogger:", error);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
};

const deleteCaracterizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = dbConnection();
    await pool.query("DELETE FROM caracterizacion WHERE id = $1", [id]);
    res.json({ msg: `Registro Caracterizacion ${id} eliminado` });
  } catch (error) {
    console.error("❌ Error al eliminar caracterizacion:", error);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
};

const updateDatalogger = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultado } = req.body;
    
    // Validar que se reciba el array de resultados
    if (!resultado || !Array.isArray(resultado)) {
      return res.status(400).json({ error: "El campo 'resultado' es requerido y debe ser un array." });
    }

    const pool = dbConnection();
    // Actualizamos el campo JSONB "resultado"
    // NOTA: Asegúrate de que tu columna sea JSON o JSONB. Si es TEXT, el driver podría manejarlo, 
    // pero idealmente se pasa como string JSON o el driver de PG lo serializa.
    // Aquí asumimos que node-postgres serializa objetos/arrays a JSON automáticamente.
    const query = "UPDATE datalogger SET resultado = $1 WHERE id = $2";
    await pool.query(query, [JSON.stringify(resultado), id]);

    res.json({ msg: `Registro Datalogger ${id} actualizado` });
  } catch (error) {
    console.error("❌ Error al actualizar datalogger:", error);
    res.status(500).json({ error: "Error al actualizar registro" });
  }
};

const updateCaracterizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultado } = req.body;

    if (!resultado || !Array.isArray(resultado)) {
      return res.status(400).json({ error: "El campo 'resultado' es requerido y debe ser un array." });
    }

    const pool = dbConnection();
    const query = "UPDATE caracterizacion SET resultado = $1 WHERE id = $2";
    await pool.query(query, [JSON.stringify(resultado), id]);

    res.json({ msg: `Registro Caracterizacion ${id} actualizado` });
  } catch (error) {
    console.error("❌ Error al actualizar caracterizacion:", error);
    res.status(500).json({ error: "Error al actualizar registro" });
  }
};



const deleteComparacion = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = dbConnection();
    await pool.query("DELETE FROM comparacion WHERE id = $1", [id]);
    res.json({ msg: `Registro Comparacion ${id} eliminado` });
  } catch (error) {
    console.error("❌ Error al eliminar comparacion:", error);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
};

const updateComparacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultado } = req.body;

    if (!resultado || !Array.isArray(resultado)) {
      return res.status(400).json({ error: "El campo 'resultado' es requerido y debe ser un array." });
    }

    const pool = dbConnection();
    const query = "UPDATE comparacion SET resultado = $1 WHERE id = $2";
    await pool.query(query, [JSON.stringify(resultado), id]);

    res.json({ msg: `Registro Comparacion ${id} actualizado` });
  } catch (error) {
    console.error("❌ Error al actualizar comparacion:", error);
    res.status(500).json({ error: "Error al actualizar registro" });
  }
};

module.exports = {
  consultaIA,
  getAllData,
  deleteDatalogger,
  deleteCaracterizacion,
  deleteComparacion,
  updateDatalogger,
  updateCaracterizacion,
  updateComparacion
};

// End of file
