const opcService = require("../services/OpcServices");

// 👉 Escribir valor en OPC
const writeADC = async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ error: "Falta el valor en el body" });
        }

        const result = await opcService.writeADC(value);
        res.json(result);
    } catch (error) {
        console.error("Error en writeADC Controller:", error);
        res.status(500).json({ error: "No se pudo escribir en OPC UA" });
    }
};

// 👉 Leer valor de OPC
const readADC = async (req, res) => {
    try {
        const result = await opcService.readADC();
        res.json(result);
    } catch (error) {
        console.error("Error en readADC Controller:", error);
        res.status(500).json({ error: "No se pudo leer de OPC UA" });
    }
};

module.exports = { writeADC, readADC };
