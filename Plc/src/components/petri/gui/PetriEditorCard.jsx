import React, { useState, useRef } from "react";
import { CCard, CCardHeader, CButton } from "@coreui/react-pro";
import PetriIncidenceMatrix from "./PetriIncidenceMatrix";

const PetriEditorCard = ({ initialJson }) => {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // ✅ Validar estructura base
  const [petriData, setPetriData] = useState(() => validateInitialJson(initialJson));
  const [selectedElement, setSelectedElement] = useState(null);

  function validateInitialJson(json) {
    if (!json || !json.places || !json.transitions || !json.arcs) {
      console.warn("⚠️ JSON inválido, usando estructura vacía.");
      return { places: [], transitions: [], arcs: [] };
    }
    return json;
  }

  // ====== DRAG ======
  const handleMouseDown = (e) => {
    setDragging(true);
    setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // ====== HELPERS ======
  const elementType = (el) => {
    if (!el) return "unknown";
    if (el.id?.startsWith("P")) return "places";
    if (el.id?.startsWith("T")) return "transitions";
    if (el.source && el.target) return "arcs";
    return "unknown";
  };

  const generateUniqueId = (prefix, existing) => {
    let id;
    do {
      id = `${prefix}${Math.floor(Math.random() * 1000)}`;
    } while (existing.some((el) => el.id === id));
    return id;
  };

  // ====== AGREGAR ELEMENTO ======
  const addElement = (type) => {
    setPetriData((prev) => {
      const newData = structuredClone(prev);

      if (type === "place") {
        const id = generateUniqueId("P", newData.places);
        newData.places.push({ id, name: id, initialMarking: 0 });
      } else if (type === "transition") {
        const id = generateUniqueId("T", newData.transitions);
        newData.transitions.push({ id, name: id, timed: false, rate: 1 });
      } else if (type === "arc") {
        if (newData.places.length === 0 || newData.transitions.length === 0) {
          alert("Debe haber al menos un lugar y una transición antes de crear un arco.");
          return prev;
        }
        newData.arcs.push({
          source: newData.places[0].id,
          target: newData.transitions[0].id,
          weight: 1,
        });
      }

      return newData;
    });
  };

  // ====== ACTUALIZAR PROPIEDADES ======
  const handleChangeProperty = (key, value) => {
    if (!selectedElement) return;

    let newValue = typeof value === "string" ? value.trim() : value;
    if (["initialMarking", "weight", "rate"].includes(key)) {
      const num = parseInt(newValue, 10);
      if (isNaN(num) || num < 0) return;
      newValue = num;
    }

    if (key === "timed") newValue = Boolean(value);

    const updatedElement = { ...selectedElement, [key]: newValue };
    setSelectedElement(updatedElement);

    setPetriData((prevData) => {
      const newData = structuredClone(prevData);
      const type = elementType(selectedElement);
      const list = newData[type];
      const index = list.findIndex((el) => el.id === selectedElement.id);
      if (index !== -1) list[index] = updatedElement;
      return newData;
    });
  };

  // ====== RENDER DE PROPIEDADES ======
  const renderProperties = () => {
    if (!selectedElement) return <p>Selecciona un elemento para editar</p>;

    const entries = Object.entries(selectedElement);
    return (
      <>
        <h6>
          {selectedElement.id} ({elementType(selectedElement)})
        </h6>
        {entries.map(([key, value]) => (
          <div key={key} style={{ marginBottom: "8px" }}>
            <label>{key}: </label>
            <input
              type={
                ["initialMarking", "weight", "rate"].includes(key)
                  ? "number"
                  : typeof value === "boolean"
                  ? "checkbox"
                  : "text"
              }
              checked={typeof value === "boolean" ? value : undefined}
              value={typeof value === "boolean" ? undefined : value}
              onChange={(e) =>
                handleChangeProperty(
                  key,
                  typeof value === "boolean" ? e.target.checked : e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "4px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
          </div>
        ))}
      </>
    );
  };

  return (
    <CCard
      ref={cardRef}
      style={{
        position: "absolute",
        top: pos.y,
        left: pos.x,
        width: "90vw",
        height: "65vh",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* CABECERA */}
      <CCardHeader
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
      >
        🧩 Editor de Red de Petri
      </CCardHeader>

      {/* CONTENIDO */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* MATRIZ */}
        <div
          style={{
            flex: 0.5,
            padding: "8px",
            borderRight: "1px solid #ccc",
            overflow: "auto",
          }}
        >
          <PetriIncidenceMatrix
            json={petriData}
            selectedElement={selectedElement}
            onElementClick={(el) =>
              setSelectedElement({ ...el, type: elementType(el) })
            }
          />
        </div>

        {/* PANEL DE PROPIEDADES */}
        <div
          style={{
            flex: 0.25,
            padding: "8px",
            borderRight: "1px solid #ccc",
            overflowY: "auto",
          }}
        >
          <h4>Propiedades</h4>
          {renderProperties()}
        </div>

        {/* PANEL JSON */}
        <div style={{ flex: 0.25, padding: "8px", overflow: "auto" }}>
          <h4>JSON</h4>
          <pre
            style={{
              background: "#f8f9fa",
              padding: "8px",
              borderRadius: "6px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              userSelect: "text",
              maxHeight: "100%",
              overflowY: "auto",
            }}
          >
            {JSON.stringify(petriData, null, 2)}
          </pre>
        </div>
      </div>

      {/* BOTONES */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "8px",
          justifyContent: "center",
          borderTop: "1px solid #ccc",
        }}
      >
        <CButton color="primary" onClick={() => addElement("place")}>
          + Lugar
        </CButton>
        <CButton color="success" onClick={() => addElement("transition")}>
          + Transición
        </CButton>
        <CButton color="warning" onClick={() => addElement("arc")}>
          + Arco
        </CButton>
      </div>
    </CCard>
  );
};

export default PetriEditorCard;
