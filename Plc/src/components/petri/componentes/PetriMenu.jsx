import React from "react";
import { CCard, CCardBody, CButton } from "@coreui/react-pro";

const PetriMenu = () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
      <CCard>
        <CCardBody className="d-flex flex-column gap-2">
          <CButton
            color="primary"
            size="sm"   // ⬅ tamaño más pequeño
            draggable
            onDragStart={(e) => onDragStart(e, "place")}
          >
            🔵 Place
          </CButton>

          <CButton
            color="success"
            size="sm"   // ⬅ tamaño más pequeño
            draggable
            onDragStart={(e) => onDragStart(e, "transition")}
          >
            ⬛ Transition
          </CButton>
        </CCardBody>
      </CCard>
  );
};

export default PetriMenu;
