import React, { useContext, useMemo } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CBadge,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from "@coreui/react-pro";
import { MqttContext } from "../../context/MqttContext";
import "./HolonGui.css";

const HolonGui = () => {
  const { connected, recursos, ordenes } = useContext(MqttContext);

  const recursosParaMostrar =
    Object.keys(recursos).length > 0 ? recursos : { HR_CNC_01: {} };

  // 🧠 Detecta el último mensaje de adjudicación (AdO)
  const ultimaAdjudicacion = useMemo(() => {
    if (!ordenes?.length) return null;
    const ados = ordenes.filter((o) => o.tipo_msg === "AdO");
    return ados.length > 0 ? ados[ados.length - 1] : null;
  }, [ordenes]);

  // 🧩 Detectar estados del proceso de negociación (por tipo_msg)
  const estadoNegociacion = useMemo(() => {
    if (!ordenes?.length) return null;
    const ultimo = ordenes[ordenes.length - 1];

    switch (ultimo.tipo_msg) {
      case "OfO":
        return { texto: "📨 Enviando oferta...", color: "info" };
      case "SdeO":
        return { texto: "✅ Oferta aceptada", color: "success" };
      case "AdO":
        return {
          texto: `🏆 Oferta ganadora: ${ultimo.recurso_asignado || "N/A"}`,
          color: "success",
          id_orden: ultimo.id_orden,
          timestamp: ultimo.timestamp,
        };
      default:
        return null;
    }
  }, [ordenes]);

  // 🧾 Diccionario de significados
  const leyenda = [
    { tipo: "Se", color: "info", descripcion: "Solicitud de ejecución (Supervisor → Recurso)" },
    { tipo: "Of", color: "warning", descripcion: "Oferta (Recurso → Supervisor)" },
    { tipo: "AdO", color: "success", descripcion: "Adjudicación de oferta (Supervisor → Recurso)" },
    { tipo: "Es", color: "primary", descripcion: "Estado actual del recurso" },
    { tipo: "Co", color: "secondary", descripcion: "Confirmación de tarea" },
    { tipo: "Fi", color: "dark", descripcion: "Finalización de tarea" },
    { tipo: "Er", color: "danger", descripcion: "Error o evento inesperado" },
  ];

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-white p-3 rounded shadow-sm border">
        <h3 className="fw-semibold m-0 text-primary">Sistema Holónico</h3>
        <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center" style={{ maxWidth: '75%' }}>
          <span className="text-muted small fw-bold me-2">Leyenda:</span>
          {leyenda.map((l) => (
            <CBadge
              key={l.tipo}
              color={l.color}
              className="d-flex align-items-center gap-1"
              title={l.descripcion}
              style={{ cursor: 'help' }}
            >
              <span className="fw-bold">{l.tipo}</span>
              <span className="fw-normal border-start border-light ps-1 ms-1 opacity-75">{l.descripcion}</span>
            </CBadge>
          ))}
        </div>
      </div>
      <CRow className="g-4">
        {/* 🟣 Servidor Holónico */}
        <CCol xs={12} md={6}>
          <CCard className="shadow-lg border-primary border-2 holon-card">
            <CCardHeader className="bg-gradient-primary text-white fw-bold d-flex justify-content-between align-items-center">
              Servidor Holónico
              <CBadge
                color={connected ? "success" : "secondary"}
                className="ms-auto"
              >
                {connected ? "Conectado" : "Desconectado"}
              </CBadge>
            </CCardHeader>
            <CCardBody>
              <p>
                Estado del broker:{" "}
                <CBadge color={connected ? "success" : "secondary"}>
                  {connected ? "Activo" : "Inactivo"}
                </CBadge>
              </p>
              <p>
                <strong>Tópico Supervisor:</strong>{" "}
                <span className="text-danger fw-semibold">
                  hms/mision/comando
                </span>
              </p>
              <p>
                <strong>Rol:</strong> Supervisor
              </p>
              <p>
                <strong>Mensajes recibidos:</strong> {ordenes.length}
              </p>

              {/* 🟡 Estado del proceso de oferta */}
              {estadoNegociacion && (
                <div
                  className={`alert alert-${estadoNegociacion.color} mt-3 p-2 border border-${estadoNegociacion.color} rounded`}
                >
                  <strong>{estadoNegociacion.texto}</strong>
                  {estadoNegociacion.id_orden && (
                    <>
                      <br />
                      <small className="text-muted">
                        ID orden: {estadoNegociacion.id_orden} —{" "}
                        {new Date(
                          estadoNegociacion.timestamp
                        ).toLocaleTimeString()}
                      </small>
                    </>
                  )}
                </div>
              )}

              {/* 🧾 Lista de mensajes recibidos */}
              {ordenes.length > 0 && (
                <div className="scroll-area mt-3">
                  {ordenes.map((ord, idx) => (
                    <div
                      key={idx}
                      className="orden-item border-bottom pb-1 mb-2"
                    >
                      <p className="mb-0">
                        <strong>{ord.tipo_msg || "Sin tipo"}</strong> —{" "}
                        {ord.tarea_requerida || "-"}
                      </p>
                      <small className="text-muted">
                        ID: {ord.id_orden || "N/A"} |{" "}
                        {new Date(
                          ord.timestamp || Date.now()
                        ).toLocaleTimeString()}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* 🔵 Recursos */}
        {Object.entries(recursosParaMostrar).map(([id, info]) => (
          <CCol key={id} xs={12} md={6}>
            <CCard className="shadow-lg border-info border-2 holon-card">
              <CCardHeader className="bg-gradient-info text-white fw-bold d-flex justify-content-between align-items-center">
                {id}
                <CBadge
                  color={
                    info.estado === "Disponible"
                      ? "success"
                      : info.estado === "Ofertando"
                        ? "warning"
                        : info.estado === "Ocupado"
                          ? "danger"
                          : info.estado === "Averiado"
                            ? "dark"
                            : "secondary"
                  }
                >
                  {info.estado || "Desconocido"}
                </CBadge>
              </CCardHeader>
              <CCardBody>
                <p>
                  <strong>Competencia:</strong> {info.competencia || "-"}
                </p>
                <p>
                  <strong>Carga:</strong> {info.carga ?? "-"}
                </p>
                <p>
                  <strong>Ofertas enviadas:</strong>{" "}
                  {info.ofertas?.length || 0}
                </p>

                {info.ofertas && info.ofertas.length > 0 && (
                  <div className="scroll-area mt-2">
                    {info.ofertas.map((o, idx) => (
                      <p key={idx} className="mb-1">
                        • <strong>Tarea:</strong> {o.tarea_ofertada},{" "}
                        <strong>Tiempo:</strong> {o.tiempo_estimado}s
                      </p>
                    ))}
                  </div>
                )}

                {info.timestamp && (
                  <p
                    className="text-muted mt-2"
                    style={{ fontSize: "0.8em" }}
                  >
                    Última actualización:{" "}
                    {new Date(info.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        ))}

        {/* 📜 Historial de Transacciones (En Vivo) */}
        < CCol xs={12} >
          <CCard className="shadow-lg border-dark border-top-0 border-end-0 border-bottom-0 border-start-4">
            <CCardHeader className="bg-white fw-bold d-flex justify-content-between align-items-center">
              📜 Historial de Transacciones en Vivo
              <CBadge color="dark" shape="rounded-pill">{ordenes.length}</CBadge>
            </CCardHeader>
            <CCardBody className="p-0">
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <CTable hover striped responsive className="mb-0 text-start align-middle">
                  <CTableHead className="bg-light sticky-top">
                    <CTableRow>
                      <CTableHeaderCell>Hora</CTableHeaderCell>
                      <CTableHeaderCell>ID Orden</CTableHeaderCell>
                      <CTableHeaderCell>Tipo</CTableHeaderCell>
                      <CTableHeaderCell>Detalle</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {[...ordenes].reverse().map((ord, idx) => {
                      // Buscar color en leyenda
                      const tipoInfo = leyenda.find(l => l.tipo === ord.tipo_msg) || { color: 'secondary' };
                      return (
                        <CTableRow key={idx}>
                          <CTableDataCell className="text-secondary font-monospace" style={{ fontSize: '0.85rem' }}>
                            {new Date(ord.timestamp || Date.now()).toLocaleTimeString()}
                          </CTableDataCell>
                          <CTableDataCell className="fw-semibold">
                            {ord.id_orden || "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={tipoInfo.color}>
                              {ord.tipo_msg}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            {ord.tarea_requerida || ord.recurso_asignado || "..."}
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}
                    {ordenes.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan="4" className="text-center text-muted p-4">
                          Esperando transacciones...
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

      </CRow >
    </div >
  );
};

export default HolonGui;
