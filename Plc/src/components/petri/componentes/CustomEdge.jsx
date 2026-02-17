// componentes/CustomEdge.jsx
import React, { useState, useEffect } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import "./CustomEdge.css"; // 🔹 Importa estilos globales (ver más abajo)

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data = {},
  style = {},
}) => {
  // 🧩 Generar la ruta curva del edge
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 🎛️ Estado interno del peso (tokens)
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(data.weight || 1);

  // 🔁 Sincronizar si el peso cambia externamente
  useEffect(() => {
    if (data.weight !== undefined && data.weight !== weight) {
      setWeight(data.weight);
    }
  }, [data.weight, weight]);

  // 🗑️ Eliminar arista (clic derecho)
  const handleContextMenu = (event) => {
    event.preventDefault();
    data?.onDelete?.(id);
  };

  // ✏️ Doble clic para editar
  const handleDoubleClick = () => setEditing(true);

  // 💾 Confirmar edición
  const handleCommit = () => {
    setEditing(false);
    data?.onUpdate?.(id, weight);
  };

  // ⌨️ Manejar teclado
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCommit();
    if (e.key === "Escape") {
      setEditing(false);
      setWeight(data.weight || 1); // restaura valor anterior
    }
  };

  return (
    <>
      {/* 🔹 Línea del arco */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "red" : "#555",
          strokeWidth: selected ? 3 : 2,
        }}
        onContextMenu={handleContextMenu}
      />

      {/* 🔹 Etiqueta del peso */}
      <EdgeLabelRenderer>
        <div
          onDoubleClick={handleDoubleClick}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            background: "white",
            borderRadius: "6px",
            padding: "3px 8px",
            fontSize: "12px",
            fontWeight: 500,
            color: "#333",
            border: selected ? "1px solid red" : "1px solid #ccc",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
            minWidth: "30px",
            textAlign: "center",
          }}
        >
          {editing ? (
            <input
              type="number"
              value={weight}
              min={1}
              onChange={(e) => setWeight(Number(e.target.value))}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              style={{
                width: "45px",
                fontSize: "12px",
                textAlign: "center",
                padding: "2px",
                border: "1px solid #888",
                borderRadius: "4px",
                outline: "none",
                MozAppearance: "textfield", // Firefox
              }}
              autoFocus
            />
          ) : (
            <span style={{ cursor: "pointer" }}>{weight}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
