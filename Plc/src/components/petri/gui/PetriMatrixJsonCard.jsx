import React, { useState } from "react";
import { CCard, CCardBody, CCardHeader, CCollapse, CButton } from "@coreui/react-pro";
import PetriIncidenceMatrix from "./PetriIncidenceMatrix";

const PetriMatrixJsonCard = ({ json, title = "Petri - Matriz de Incidencia", width = "800px", height = "60vh" }) => {
  const [showJson, setShowJson] = useState(false);

  const toggleJson = () => setShowJson(!showJson);

  return (
    <CCard
      style={{
        position: "absolute",
        top: "50px",
        left: "10px",
        width: width,
        height: height,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1000,
      }}
    >
      {/* Cabecera */}
      <CCardHeader style={{ width: "100%" }}>
        {title}
      </CCardHeader>

      {/* Matriz editable */}
      <CCardBody style={{ flex: 1, overflow: "auto" }}>
          <PetriIncidenceMatrix
            json={petriData}
            onElementClick={(el) => setSelectedElement(el)}
          />
      </CCardBody>

      {/* Botón para desplegar JSON */}
      <CButton
        color="primary"
        onClick={toggleJson}
        style={{ borderRadius: 0 }}
      >
        {showJson ? "Ocultar JSON" : "Mostrar JSON"}
      </CButton>

      {/* Panel desplegable JSON */}
      <CCollapse visible={showJson}>
        <CCardBody style={{ maxHeight: "20vh", overflowY: "auto" }}>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", userSelect: "text" }}>
            {JSON.stringify(json, null, 2)}
          </pre>
        </CCardBody>
      </CCollapse>
    </CCard>
  );
};

export default PetriMatrixJsonCard;
