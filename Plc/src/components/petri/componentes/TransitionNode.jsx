import React from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";

// 🔧 Importa la función auxiliar que maneja el disparo de transiciones
import { fireTransition } from "../utils/petriUtils";

const TransitionNode = ({ id, data }) => {
  const width = 40;
  const height = 80;
  const points = data.points || 1;
  const tiempo = data.tiempo || 0; // Tiempo de disparo opcional

  const { getNodes, getEdges, setNodes } = useReactFlow();

  // 🧠 Lógica de disparo de transición
  const handleFire = () => {
    const nodes = getNodes();
    const edges = getEdges();
    fireTransition(id, nodes, edges, setNodes, tiempo);
  };

  // Handles de entrada
  const targetHandles = Array.from({ length: points }, (_, i) => (
    <Handle
      key={`target-${id}-${i}`}
      type="target"
      id={`target-${id}-${i}`}
      position={Position.Left}
      style={{
        background: "red",
        width: 10,
        height: 10,
        borderRadius: "50%",
        transform: `translateY(${(i - (points - 1) / 2) * 20}px)`,
      }}
    />
  ));

  // Handles de salida
  const sourceHandles = Array.from({ length: points }, (_, i) => (
    <Handle
      key={`source-${id}-${i}`}
      type="source"
      id={`source-${id}-${i}`}
      position={Position.Right}
      style={{
        background: "blue",
        width: 10,
        height: 10,
        borderRadius: "50%",
        transform: `translateY(${(i - (points - 1) / 2) * 20}px)`,
      }}
    />
  ));

  return (
    <div
      onClick={handleFire}
      style={{
        width,
        height,
        background: "yellow",
        border: "2px solid #999",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        cursor: "pointer",
        fontWeight: "bold",
      }}
      title={`Disparar transición (tiempo=${tiempo})`}
    >
      {data.label || "T"}
      {targetHandles}
      {sourceHandles}
    </div>
  );
};

export default TransitionNode;
