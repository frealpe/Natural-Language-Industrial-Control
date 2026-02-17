import React, { createContext, useContext, useCallback } from "react";
import { useNodesState, useEdgesState, addEdge } from "@xyflow/react";

const PetriContext = createContext();

// ✅ Provider mejorado
export const PetriProvider = ({ children }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Conexión de aristas
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Añadir un nodo
  const addNode = useCallback(
    (node) => setNodes((nds) => [...nds, node]),
    [setNodes]
  );

  // Eliminar nodo por id (también elimina aristas asociadas)
  const removeNode = useCallback(
    (id) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  return (
    <PetriContext.Provider
      value={{
        nodes,
        setNodes,
        onNodesChange,
        edges,
        onEdgesChange,
        onConnect,
        addNode,
        removeNode,
      }}
    >
      {children}
    </PetriContext.Provider>
  );
};

// ✅ Hook personalizado con validación
export const usePetri = () => {
  const context = useContext(PetriContext);
  if (!context) {
    throw new Error("usePetri must be used within a PetriProvider");
  }
  return context;
};

// Exportación por defecto
export default PetriProvider;
