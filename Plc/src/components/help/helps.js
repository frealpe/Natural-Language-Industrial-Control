import { XMLParser } from "fast-xml-parser";

/**
 * Convierte un archivo PNML en JSON simplificado con estructura normalizada:
 * {
 *   places: [ { id, name, initialMarking } ],
 *   transitions: [ { id, name, timed, rate } ],
 *   arcs: [ { source, target, weight } ]
 * }
 */
export async function procesarXML(text) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("El contenido XML no es válido.");
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true,
      parseTagValue: true,
    });

    const result = parser.parse(text);
    const net = result?.pnml?.net;
    if (!net) throw new Error("No se encontró una red válida dentro del PNML.");

    // 🧩 Estructura base
    const simplified = {
      places: [],
      transitions: [],
      arcs: [],
    };

    // 🧠 Función auxiliar para convertir "Default,5" → 5
    const parseValue = (value) => {
      if (!value) return 0;
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const num = value.split(",").pop().trim();
        const n = Number(num);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    };

    // 🟢 Procesar places
    const places = Array.isArray(net.place) ? net.place : [net.place];
    for (const p of places) {
      simplified.places.push({
        id: p.id,
        name: p.name?.value || p.name || "",
        initialMarking: parseValue(p.initialMarking?.value),
      });
    }

    // 🟣 Procesar transitions
    const transitions = Array.isArray(net.transition)
      ? net.transition
      : [net.transition];
    for (const t of transitions) {
      simplified.transitions.push({
        id: t.id,
        name: t.name?.value || t.name || "",
        timed: t.timed?.value === "true" || false,
        rate: parseValue(t.rate?.value) || 1,
      });
    }

    // 🔵 Procesar arcs
    const arcs = Array.isArray(net.arc) ? net.arc : [net.arc];
    for (const a of arcs) {
      simplified.arcs.push({
        source: a.source,
        target: a.target,
        weight: parseValue(a.inscription?.value) || 1,
      });
    }

    return simplified;
  } catch (error) {
    console.error("❌ Error al convertir XML:", error.message);
    throw new Error("Error al procesar el archivo XML. Verifica que esté bien formado.");
  }
}
