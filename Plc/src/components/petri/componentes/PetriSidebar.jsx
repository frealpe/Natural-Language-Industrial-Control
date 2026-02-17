import React, { useState } from "react";
import {
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CCollapse,
} from "@coreui/react-pro";
import PetriMenu from "./PetriMenu";

const PetriSidebar = ({
  selectedNode,
  setSelectedNode,
  updateNodeProperty,
  updateEdgeProperty, // 🔹 nueva función
  removeNode,
  onDragStart,
  edges = [], // 🔹 lista de conexiones
}) => {
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <CCard className="shadow-sm mb-2">
      <CCardHeader>
        <CButton
          color="primary"
          size="sm"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ width: "100%" }}
        >
          {menuOpen ? "Ocultar Menú" : "Mostrar Menú"}
        </CButton>
      </CCardHeader>

      <CCollapse visible={menuOpen}>
        <CCardBody className="p-2 d-flex flex-column gap-2">
          <PetriMenu compact onDragStart={onDragStart} />

          {/* 🧩 Panel de propiedades solo si hay nodo seleccionado */}
          {selectedNode && (
            <CCard className="mt-2">
              <CCardBody className="p-2 d-flex flex-column gap-2">
                <strong>
                  {selectedNode.type.toUpperCase()} - {selectedNode.id}
                </strong>

                {/* 🟣 Si es un "place" */}
                {selectedNode.type === "place" && (
                  <>
                    <label>Tokens:</label>
                    <input
                      type="number"
                      value={selectedNode.data.tokens || 0}
                      onChange={(e) =>
                        updateNodeProperty("tokens", parseInt(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />

                    <label>Puntos de conexión:</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedNode.data.points || 1}
                      onChange={(e) =>
                        updateNodeProperty("points", parseInt(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />

                    <label>Dirección inicial:</label>
                    <select
                      value={selectedNode.data.initialDirection || "right"}
                      onChange={(e) =>
                        updateNodeProperty("initialDirection", e.target.value)
                      }
                      style={{ width: "100%" }}
                    >
                      <option value="left">Izquierda</option>
                      <option value="right">Derecha</option>
                    </select>
                  </>
                )}

                {/* 🟡 Si es una "transition" */}
                {selectedNode.type === "transition" && (
                  <>
                    <label>Condición:</label>
                    <input
                      type="text"
                      value={selectedNode.data.condition || ""}
                      onChange={(e) =>
                        updateNodeProperty("condition", e.target.value)
                      }
                      style={{ width: "100%" }}
                    />
                  </>
                )}

                {/* 🔹 Mostrar conexiones relacionadas */}
                {edges.length > 0 && (
                  <>
                    <hr />
                    <strong>Conexiones</strong>

                    {/* Entrantes */}
                    <div>
                      <label>Entrantes:</label>
                      {edges.filter((e) => e.target === selectedNode.id)
                        .length === 0 ? (
                        <div className="text-muted">Ninguna</div>
                      ) : (
                        edges
                          .filter((e) => e.target === selectedNode.id)
                          .map((edge) => (
                            <div
                              key={edge.id}
                              className="d-flex align-items-center justify-content-between my-1"
                            >
                              <span>{edge.source}</span>
                              <input
                                type="number"
                                min={1}
                                value={edge.data?.weight || 1}
                                onChange={(e) =>
                                  updateEdgeProperty(
                                    edge.id,
                                    "weight",
                                    parseInt(e.target.value)
                                  )
                                }
                                style={{
                                  width: "60px",
                                  textAlign: "center",
                                }}
                              />
                            </div>
                          ))
                      )}
                    </div>

                    {/* Salientes */}
                    <div className="mt-2">
                      <label>Salientes:</label>
                      {edges.filter((e) => e.source === selectedNode.id)
                        .length === 0 ? (
                        <div className="text-muted">Ninguna</div>
                      ) : (
                        edges
                          .filter((e) => e.source === selectedNode.id)
                          .map((edge) => (
                            <div
                              key={edge.id}
                              className="d-flex align-items-center justify-content-between my-1"
                            >
                              <span>{edge.target}</span>
                              <input
                                type="number"
                                min={1}
                                value={edge.data?.weight || 1}
                                onChange={(e) =>
                                  updateEdgeProperty(
                                    edge.id,
                                    "weight",
                                    parseInt(e.target.value)
                                  )
                                }
                                style={{
                                  width: "60px",
                                  textAlign: "center",
                                }}
                              />
                            </div>
                          ))
                      )}
                    </div>
                  </>
                )}

                <hr />
                <CButton
                  color="danger"
                  size="sm"
                  onClick={() => {
                    removeNode(selectedNode.id);
                    setSelectedNode(null);
                  }}
                  style={{ width: "100%" }}
                >
                  Eliminar Nodo
                </CButton>
              </CCardBody>
            </CCard>
          )}
        </CCardBody>
      </CCollapse>
    </CCard>
  );
};

export default PetriSidebar;
