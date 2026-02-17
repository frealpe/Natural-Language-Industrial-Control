import React, { useCallback, useState } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
} from "@coreui/react-pro";
import { usePetri } from "./PetriProvider";
import {
  PlaceNode,
  TransitionNode,
  PetriSidebar,
  CustomEdge,
} from "./componentes";
import { fireTransition } from "./utils/petriUtils"; // 🔹 Importar la lógica de disparo

const nodeTypes = { place: PlaceNode, transition: TransitionNode };
const edgeTypes = { custom: CustomEdge };

const Petri = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    addNode,
    removeNode,
  } = usePetri();

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);


const updateEdgeProperty = (edgeId, key, value) => {
  setEdges((eds) =>
    eds.map((edge) =>
      edge.id === edgeId
        ? { ...edge, data: { ...edge.data, [key]: value } }
        : edge
    )
  );
};


  // 🔹 Manejar drop desde el menú lateral
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const bounds = event.target.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position: {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
        data: { label: type, tokens: 0, points: 1, condition: "" },
      };
      addNode(newNode);
    },
    [addNode]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // 🔹 Selección de nodos
  const onNodeClick = useCallback((_, node) => {
    setSelectedEdge(null);
    setSelectedNode(node);
  }, []);

  // 🔹 Selección de edges
  const onEdgeClick = useCallback((_, edge) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, []);

  // 🔹 Actualizar propiedad del nodo
  const updateNodeProperty = useCallback(
    (key, value) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, [key]: value } }
            : n
        )
      );
      setSelectedNode((prev) => ({
        ...prev,
        data: { ...prev.data, [key]: value },
      }));
    },
    [selectedNode, setNodes]
  );

  // 🔹 Eliminar con tecla Supr
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNode) {
          removeNode(selectedNode.id);
          setSelectedNode(null);
        }
        if (selectedEdge) {
          setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
          setSelectedEdge(null);
        }
      }
    },
    [selectedNode, selectedEdge, removeNode, setEdges]
  );

  // 🔹 Mapear edges con control de peso y eliminación
  const styledEdges = edges.map((edge) => ({
    ...edge,
    type: "custom",
    data: {
      ...edge.data,
      weight: edge.data?.weight || 1, // Valor por defecto 1
      onDelete: (id) => setEdges((eds) => eds.filter((e) => e.id !== id)),
      onUpdate: (id, newWeight) =>
        setEdges((eds) =>
          eds.map((e) =>
            e.id === id ? { ...e, data: { ...e.data, weight: newWeight } } : e
          )
        ),
    },
  }));

  // 🔥 Disparar transición al hacer doble clic
  const onNodeDoubleClick = useCallback(
    (_, node) => {
      if (node.type === "transition") {
        fireTransition(node.id, nodes, edges, setNodes);
      }
    },
    [nodes, edges, setNodes]
  );

  return (
    <CContainer fluid className="p-3" onKeyDown={handleKeyDown} tabIndex={0}>
      <CRow>
        <CCol md={2}>
          <PetriSidebar
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            updateNodeProperty={updateNodeProperty}
            updateEdgeProperty={updateEdgeProperty}
            removeNode={removeNode}
            edges={edges} // ✅ ¡Pasamos los edges!
            onDragStart={(e, type) =>
              e.dataTransfer.setData("application/reactflow", type)
            }
          />

        </CCol>

        <CCol md={10}>
          <CCard className="shadow-sm">
            <CCardHeader>
              <h5>Red de Petri</h5>
            </CCardHeader>
            <CCardBody style={{ height: "70vh" }}>
              <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                fitView
              >
                <Background />
                <Controls />
              </ReactFlow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default Petri;
