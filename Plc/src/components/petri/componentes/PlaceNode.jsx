import React from "react";
import { Handle, Position } from "@xyflow/react";

const PlaceNode = ({ data }) => {
  const size = 60;
  const points = data.points || 1;
  const direction = data.initialDirection || "right";
  const tokens = data.tokens || 0; // 🔹 Número de tokens

  // Posiciones de los handles
  const sourcePosition =
    direction.toLowerCase() === "left" ? Position.Left : Position.Right;
  const targetPosition =
    sourcePosition === Position.Left ? Position.Right : Position.Left;

  // Handles de salida
  const sourceHandles = Array.from({ length: points }, (_, i) => (
    <Handle
      key={`source-${data.id}-${i}`}
      type="source"
      id={`source-${data.id}-${i}`}
      position={sourcePosition}
      style={{
        background: "blue",
        width: 10,
        height: 10,
        borderRadius: "50%",
        transform: `translateY(${(i - (points - 1) / 2) * 20}px)`,
      }}
    />
  ));

  // Handles de entrada
  const targetHandles = Array.from({ length: points }, (_, i) => (
    <Handle
      key={`target-${data.id}-${i}`}
      type="target"
      id={`target-${data.id}-${i}`}
      position={targetPosition}
      style={{
        background: "red",
        width: 10,
        height: 10,
        borderRadius: "50%",
        transform: `translateY(${(i - (points - 1) / 2) * 20}px)`,
      }}
    />
  ));

  // 🔹 Renderizar los tokens
  const renderTokens = () => {
    if (tokens === 0) return null;

    // Si hay 1 token → centro
    if (tokens === 1)
      return (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "black",
          }}
        />
      );

    // Si hay varios tokens → distribuidos dentro del círculo
    const positions = Array.from({ length: tokens }).map((_, i) => {
      const angle = (i / tokens) * 2 * Math.PI;
      const r = 15; // radio interno donde se colocan los tokens
      return {
        left: `${50 + r * Math.cos(angle)}%`,
        top: `${50 + r * Math.sin(angle)}%`,
      };
    });

    return positions.map((pos, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "black",
          transform: "translate(-50%, -50%)",
          ...pos,
        }}
      />
    ));
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid blue",
        background: "#e0f0ff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        fontWeight: "bold",
      }}
    >
      {renderTokens()}
      {sourceHandles}
      {targetHandles}
    </div>
  );
};

export default PlaceNode;
