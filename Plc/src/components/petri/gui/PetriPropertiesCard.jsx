import React from "react";
import {
  CCard,
  CCardBody,
  CFormInput,
  CFormLabel,
  CRow,
  CCol,
} from "@coreui/react-pro";

const PetriPropertiesCard = ({ selectedElement, json, setJson }) => {
  if (!selectedElement)
    return (
      <CCard>
        <CCardBody>
          <strong>Selecciona un elemento para editar</strong>
        </CCardBody>
      </CCard>
    );

  // Detectar tipo de elemento
  const detectType = (el) => {
    if (el.capacity !== undefined) return "place";
    if (el.rate !== undefined) return "transition";
    if (el.source && el.target) return "arc";
    return "unknown";
  };
  const type = selectedElement.type || detectType(selectedElement);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setJson((prev) => {
      const newJson = structuredClone(prev);
      const net = newJson?.pnml?.net;
      if (!net) return newJson;

      let list = [];
      if (type === "place") list = net.place || [];
      if (type === "transition") list = net.transition || [];
      if (type === "arc") list = net.arc || [];

      const element = list.find((p) => p.id === selectedElement.id);
      if (!element) return newJson;

      // Actualización profunda
      switch (name) {
        case "name":
          if (element.name?.value !== undefined) element.name.value = value;
          else element.name = { value };
          break;

        case "capacity":
          element.capacity = Number(value);
          break;

        case "initialMarking":
          if (element.initialMarking?.text !== undefined)
            element.initialMarking.text = value;
          else element.initialMarking = { text: value };
          break;

        case "x":
        case "y":
          if (!element.graphics) element.graphics = {};
          if (!element.graphics.position) element.graphics.position = {};
          element.graphics.position[name] = Number(value);
          break;

        default:
          element[name] = value;
      }

      return newJson;
    });
  };

  // Datos visuales
  const posX = selectedElement.graphics?.position?.x ?? "";
  const posY = selectedElement.graphics?.position?.y ?? "";
  const nameVal =
    selectedElement.name?.value ?? selectedElement.name ?? selectedElement.id;
  const capacity = selectedElement.capacity ?? "";
  const initMark =
    selectedElement.initialMarking?.text ??
    selectedElement.tokens ??
    "";
  const rate = selectedElement.rate ?? "";

  return (
    <CCard>
      <CCardBody>
        <h6>
          Propiedades de <strong>{selectedElement.id}</strong> ({type})
        </h6>

        {/* Nombre */}
        <CFormLabel>Nombre:</CFormLabel>
        <CFormInput
          type="text"
          name="name"
          onChange={handleChange}
          defaultValue={nameVal}
        />

        {/* Campos específicos */}
        {type === "place" && (
          <>
            <CFormLabel>Capacidad:</CFormLabel>
            <CFormInput
              type="number"
              name="capacity"
              onChange={handleChange}
              defaultValue={capacity}
            />

            <CFormLabel>Marcado inicial:</CFormLabel>
            <CFormInput
              type="text"
              name="initialMarking"
              onChange={handleChange}
              defaultValue={initMark}
            />
          </>
        )}

        {type === "transition" && (
          <>
            <CFormLabel>Tasa (rate):</CFormLabel>
            <CFormInput
              type="number"
              name="rate"
              onChange={handleChange}
              defaultValue={rate}
            />
          </>
        )}

        {/* Posición */}
        <h6 className="mt-3">📍 Posición gráfica</h6>
        <CRow>
          <CCol>
            <CFormLabel>X:</CFormLabel>
            <CFormInput
              type="number"
              name="x"
              onChange={handleChange}
              defaultValue={posX}
            />
          </CCol>
          <CCol>
            <CFormLabel>Y:</CFormLabel>
            <CFormInput
              type="number"
              name="y"
              onChange={handleChange}
              defaultValue={posY}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  );
};

export default PetriPropertiesCard;
