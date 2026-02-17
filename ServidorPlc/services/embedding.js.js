const { dbConnection } = require("../database/config");
const { generateEmbedding } = require("./generateEmbedding");
const { rangosVariables } = require("./helpers");

async function saveEmbedding({ prompt, resultados, Prueba }) {
  try {
    if (!resultados || resultados.length === 0) {
      console.warn("⚠️ No se encontraron datos en resultados");
      return;
    }

    const { rangos } = rangosVariables(resultados);
    console.log(rangos);

    const client = await dbConnection(); // conexión correcta

    for (const rango of rangos) {
      const rangoStr = `${rango.min}-${rango.max}`;

      const datos = rango.items;
      console.log("Datos",datos);
      // Generar embedding
      const embedding = await generateEmbedding(JSON.stringify(datos));

      // Convertir a formato pgvector
      const embeddingVector = `[${embedding.map(Number).join(",")}]`;

      const datosJson = JSON.stringify(rango.items); // JSON válido

      const query = `
        INSERT INTO prueba (rango, datos, embedding)
        VALUES ($1, $2::jsonb, $3::vector)
        RETURNING id;
      `;
      const res = await client.query(query, [rangoStr, datosJson, embeddingVector]);

      console.log(`✅ Rango insertado: ${rangoStr}, id: ${res.rows[0].id}`);
    }

    await client.end();

  } catch (error) { 
    console.error("❌ Error al guardar embedding:", error.message);
    if (error.detail) console.error("Detalle:", error.detail);
  }
}

module.exports = { saveEmbedding };
