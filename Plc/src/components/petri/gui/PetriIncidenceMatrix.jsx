import React, { useEffect, useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CButton,
} from "@coreui/react-pro";

const PetriIncidenceMatrix = ({ json, onElementClick }) => {
  if (
    !json ||
    !Array.isArray(json.places) ||
    !Array.isArray(json.transitions) ||
    !Array.isArray(json.arcs)
  ) {
    return <p>No hay datos válidos de la red.</p>;
  }

  const lugares = json.places.map((p) => p.id);
  const transiciones = json.transitions.map((t) => t.id);

  // 🔵 Estado del marcado y del marcado inicial
  const [marcadoInicial, setMarcadoInicial] = useState(
    json.places.map((p) => parseInt(p.initialMarking || 0, 10))
  );
  const [marcado, setMarcado] = useState([...marcadoInicial]);

  // 🧩 Actualizar marcado si cambian los datos del JSON
  useEffect(() => {
    const nuevoMarcadoInicial = json.places.map((p) =>
      parseInt(p.initialMarking || 0, 10)
    );
    setMarcadoInicial(nuevoMarcadoInicial);
    setMarcado([...nuevoMarcadoInicial]);
  }, [json]);

  // 🧮 Construcción de la matriz de incidencia
  const matrizIncidencia = lugares.map((lugar) =>
    transiciones.map((t) => {
      const arcoEntrada = json.arcs?.find(
        (arc) => arc?.source === lugar && arc?.target === t
      );
      const cMenos = arcoEntrada ? parseInt(arcoEntrada.weight || 1, 10) : 0;

      const arcoSalida = json.arcs?.find(
        (arc) => arc?.source === t && arc?.target === lugar
      );
      const cMas = arcoSalida ? parseInt(arcoSalida.weight || 1, 10) : 0;

      return cMas - cMenos;
    })
  );

  // 🚦 Verificar si una transición está habilitada
  const transicionHabilitada = (tIndex) => {
    for (let i = 0; i < lugares.length; i++) {
      const valor = matrizIncidencia[i][tIndex];
      if (valor < 0 && marcado[i] < Math.abs(valor)) {
        return false;
      }
    }
    return true;
  };

  // 🔥 Disparar transición
  const disparar = (tIndex) => {
    if (!transicionHabilitada(tIndex)) {
      alert("⚠️ Transición no habilitada (tokens insuficientes).");
      return;
    }
    const nuevoMarcado = marcado.map(
      (m, i) => m + matrizIncidencia[i][tIndex]
    );
    setMarcado(nuevoMarcado);
  };

  // 🔁 Resetear al marcado inicial
  const resetRed = () => {
    setMarcado([...marcadoInicial]);
  };

  // 🎯 Eventos de selección
  const handleLugarClick = (lugarId) => {
    const lugarData = json.places.find((p) => p.id === lugarId);
    if (lugarData) onElementClick?.({ ...lugarData, type: "place" });
  };

  const handleTransicionClick = (transId) => {
    const transData = json.transitions.find((t) => t.id === transId);
    if (transData) onElementClick?.({ ...transData, type: "transition" });
  };

  return (
    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
      {/* 🧮 Matriz de Incidencia */}
      <CCard style={{ width: "400px" }}>
        <CCardHeader>Matriz de Incidencia</CCardHeader>
        <CCardBody style={{ overflowX: "auto" }}>
          <CTable bordered small hover responsive>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Lugar / Transición</CTableHeaderCell>
                {transiciones.map((t) => (
                  <CTableHeaderCell
                    key={t}
                    onClick={() => handleTransicionClick(t)}
                    style={{ cursor: "pointer", color: "#007bff" }}
                  >
                    {t}
                  </CTableHeaderCell>
                ))}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {matrizIncidencia.map((fila, i) => (
                <CTableRow
                  key={lugares[i]}
                  onClick={() => handleLugarClick(lugares[i])}
                  style={{ cursor: "pointer" }}
                >
                  <CTableDataCell style={{ fontWeight: "bold" }}>
                    {lugares[i]}
                  </CTableDataCell>
                  {fila.map((val, j) => (
                    <CTableDataCell key={j}>{val}</CTableDataCell>
                  ))}
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      {/* 🔵 Marcado actual */}
      <CCard style={{ width: "300px" }}>
        <CCardHeader>Marcado Actual</CCardHeader>
        <CCardBody>
          <CTable small bordered responsive>
            <CTableHead color="light">
              <CTableRow>
                {lugares.map((l) => (
                  <CTableHeaderCell
                    key={l}
                    onClick={() => handleLugarClick(l)}
                    style={{ cursor: "pointer", color: "#007bff" }}
                  >
                    {l}
                  </CTableHeaderCell>
                ))}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              <CTableRow>
                {marcado.map((m, i) => (
                  <CTableDataCell key={i}>{m}</CTableDataCell>
                ))}
              </CTableRow>
            </CTableBody>
          </CTable>

          <div style={{ marginTop: "12px" }}>
            {transiciones.map((t, i) => (
              <CButton
                key={t}
                size="sm"
                color={transicionHabilitada(i) ? "primary" : "secondary"}
                disabled={!transicionHabilitada(i)}
                style={{ marginRight: "8px", marginBottom: "8px" }}
                onClick={() => disparar(i)}
              >
                Disparar {t}
              </CButton>
            ))}

            <CButton
              size="sm"
              color="danger"
              style={{ marginTop: "8px", display: "block" }}
              onClick={resetRed}
            >
              🔄 Resetear Red
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
};

export default PetriIncidenceMatrix;
