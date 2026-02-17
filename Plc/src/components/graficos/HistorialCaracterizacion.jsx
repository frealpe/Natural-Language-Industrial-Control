import React, { useEffect, useState, useRef } from "react";
import { VegaLite } from "react-vega";
import * as vl from "vega-lite-api";

const CATEGORY10 = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

const HistorialCaracterizacion = ({
  registros = [],
  selectedIds = [], // Debe ser un array de IDs seleccionados (por ejemplo [2,3])
  width = 420,
  height = 220,
}) => {
  const [spec, setSpec] = useState(null);
  const registrosRef = useRef([]);

  // ✅ Mantener una copia actualizada de los registros
  useEffect(() => {
    const normalized = Array.isArray(registros)
      ? registros
      : registros
        ? [registros]
        : [];
    registrosRef.current = normalized;
    console.log("📘 HistorialCaracterizacion - registros:", normalized);
  }, [registros]);

  useEffect(() => {
    const currentRegistros = registrosRef.current;

    // ✅ Asegurar que selectedIds sea siempre array
    const idsSeleccionados = Array.isArray(selectedIds)
      ? selectedIds
      : [selectedIds];

    // ✅ Filtrar y preparar datos para graficar
    const datosSeleccionados = currentRegistros
      .filter((reg) => idsSeleccionados.includes(reg.id))
      .flatMap((reg) =>
        (reg.resultado || []).map((punto) => ({
          tiempo: parseFloat(punto.tiempo),
          valor: parseFloat(punto.voltaje),
          id: reg.id,
        }))
      );

    if (datosSeleccionados.length === 0) {
      setSpec(null);
      return;
    }

    // ✅ Asignar color único a cada ID
    const uniqueIds = [...new Set(datosSeleccionados.map((d) => d.id))];
    const colorMap = {};
    uniqueIds.forEach((id, i) => {
      colorMap[id] = CATEGORY10[i % CATEGORY10.length];
    });

    // ✅ Crear especificación Vega-Lite
    const baseSpec = vl
      .markLine({ point: true, interpolate: "linear" })
      .encode(
        vl.x().fieldQ("tiempo").title("Tiempo (s)"),
        vl.y().fieldQ("valor").title("Voltaje (V)").scale({ domain: [0, 10] }),
        vl
          .color()
          .fieldN("id")
          //   .title("Registro ID")
          .legend({ orient: "bottom" })
      )
      .width(width)
      .height(height)
      .autosize({ type: "fit", contains: "padding" })
      .data(datosSeleccionados)
      .config({
        view: { stroke: "transparent" },
        axis: { labelFontSize: 11, titleFontSize: 13 },
        legend: { titleFontSize: 12, labelFontSize: 11 },
      })
      .toSpec();

    // ✅ Permitir zoom horizontal
    baseSpec.selection = {
      zoom: { type: "interval", encodings: ["x"], bind: "scales" },
    };

    setSpec(baseSpec);
  }, [selectedIds, width, height, registros]);

  // ======================
  // Renderizado
  // ======================
  return (
    <div style={{ width: "100%", height: "100%" }}>
      {spec ? (
        <VegaLite spec={spec} actions={false} />
      ) : (
        <div
          style={{
            color: "#888",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Array.isArray(selectedIds) && selectedIds.length === 0
            ? "Selecciona registros para graficar"
            : "Cargando gráfico..."}
        </div>
      )}
    </div>
  );
};

export default HistorialCaracterizacion;
