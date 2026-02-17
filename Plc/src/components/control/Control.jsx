import React, { useContext, useEffect, useState, useRef } from "react";
import { CRow, CCol, CCard, CCardBody, CBadge, CCardHeader, CCardTitle, CTabs, CTabList, CTab, CTabContent, CTabPanel, CButton } from "@coreui/react-pro";
import { FaDownload } from "react-icons/fa";
import { SocketContext } from "../../context/SocketContext";
import { iotApi } from "../../api/iotApi"; // 🆕 Importar API cliente
import TiempoReal from "../graficos/TiempoReal";
import Historicos from "../graficos/Historicos";
import TablasDatos from "../graficos/TablasDatos";
import TablasCaracterizacion from "../graficos/TablasCaracterizacion";

import TablasComparacion from "../graficos/TablasComparacion";
import GptMessage from "../chat-bubbles/GptMessage";
import MyMessage from "../chat-bubbles/MyMessage";
import TypingLoader from "../loaders/TypingLoader";
import TextMessageBox from "../chat-input-boxes/TextMessageBox";
import { useInteligenciaStore } from "../../hook/inteligencia/useInteligencia";
// import HistorialCaracterizacion from "../graficos/HistorialCaracterizacion";
import TarjetaTransparente from "../petri/tarjeta/TarjetaTransparente";

// Hook para medir tamaño de tarjetas
const useCardSize = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSize(entry.contentRect);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
};

export const Control = () => {
  const { envioMensajeIA } = useInteligenciaStore();
  const { socket } = useContext(SocketContext);

  const [datoshis, setDatoshis] = useState([]);
  const [reset, setReset] = useState([]);
  const [datosrt, setDatosrt] = useState([]);
  const [messages, setMessages] = useState([]);
  const [serverLogs, setServerLogs] = useState([]); // 📋 State for server logs
  const [isLoading, setIsLoading] = useState(false);
  const [resetTiempoReal, setResetTiempoReal] = useState(false);
  const [consulta, setConsulta] = useState(null);
  const [selectedIdsControl, setSelectedIdsControl] = useState([]);
  const [selectedIdsCaracterizacion, setSelectedIdsCaracterizacion] = useState([]);
  const [selectedIdsComparacion, setSelectedIdsComparacion] = useState([]);
  const [activeTab, setActiveTab] = useState('Registros');  // 🆕 Estado para el tab activo

  // Refs de tamaño
  const { ref: tiempoRealRef, size: sizeRT } = useCardSize();
  const { ref: historicosRef, size: sizeHist } = useCardSize();
  // const { ref: histCaractRef, size: sizeCaract } = useCardSize();

  const messagesEndRef = useRef(null);

  // =======================
  // HANDLER CHAT
  // =======================
  const handlePost = async (mensaje) => {
    if (!mensaje?.text?.trim() && !mensaje?.file) return;

    const mensajeNormalizado = {
      text: mensaje.text?.trim() || "",
      file: mensaje.file || null,
    };

    // 1️⃣ Agregamos el mensaje del usuario inmediatamente
    setMessages((prev) => [...prev, { text: mensajeNormalizado.text, isGpt: false }]);

    // 🔹 Limpiar datos de tiempo real antes de procesar
    setDatosrt([]);           // Limpiar datos históricos de tiempo real
    setResetTiempoReal(true); // Forzar remount del componente TiempoReal

    try {
      setIsLoading(true);

      const { conversacion, resultado, tipo } = await envioMensajeIA({ mensaje: mensajeNormalizado });

      // 2️⃣ Procesamos la respuesta de la IA
      switch (tipo) {
        case "Sql":
          if (resultado?.resultados && Array.isArray(resultado.resultados)) {
            const consultaNueva = resultado.resultados.reduce((acc, bloque) => {
              if (bloque?.nombre && bloque?.datos) acc[bloque.nombre] = bloque.datos;
              return acc;
            }, {});
            if (JSON.stringify(consultaNueva) !== JSON.stringify(consulta))
              setConsulta(consultaNueva);
          }
          break;

        case "Plc":
          break;

        default:
          setConsulta({ tipo: "Desconocido", datos: resultado });
          break;
      }

      // 3️⃣ Agregamos la respuesta de la IA
      setMessages((prev) => [...prev, { text: conversacion, isGpt: true }]);
    } catch (error) {
      console.error("❌ Error al procesar mensaje:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Hubo un error al obtener respuesta de la IA.", isGpt: true },
      ]);
    } finally {
      // 🔹 desactivar reset después de un corto delay
      setTimeout(() => setResetTiempoReal(false), 100);
      setIsLoading(false);
    }
  };

  // 🔹 Carga automática de datos (Reutilizable)
  const cargarDatosIniciales = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      console.log("⚡ Cargando datos iniciales desde BD...");

      const { data } = await iotApi.get('consulta/all');

      if (data) {
        setConsulta({
          datalogger: data.datalogger || [],
          caracterizacion: data.caracterizacion || [],
          comparacion: data.comparacion || []
        });
      }
    } catch (error) {
      console.error("❌ Error al cargar datos iniciales:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // 🔹 Función para eliminar registros
  const handleDelete = async (id, tipo) => {
    try {
      const endpoint = tipo === 'datalogger'
        ? `consulta/datalogger/${id}`
        : tipo === 'caracterizacion'
          ? `consulta/caracterizacion/${id}`
          : `consulta/comparacion/${id}`;

      await iotApi.delete(endpoint);

      // Recargar datos tras eliminación
      // Reutilizamos la lógica de carga inicial pero extrayéndola o simplemente actualizando el estado local
      // Para consistencia total, recargamos todo:
      const { data } = await iotApi.get('consulta/all');
      if (data) {
        setConsulta({
          datalogger: data.datalogger || [],
          caracterizacion: data.caracterizacion || [],
          comparacion: data.comparacion || []
        });

        // Limpiar selección si el ID eliminado estaba seleccionado
        if (tipo === 'datalogger') {
          setSelectedIdsControl(prev => prev.filter(pid => pid !== id));
        } else if (tipo === 'caracterizacion') {
          setSelectedIdsCaracterizacion(prev => prev.filter(pid => pid !== id));
        } else {
          setSelectedIdsComparacion(prev => prev.filter(pid => pid !== id));
        }
      }

    } catch (error) {
      console.error(`❌ Error al eliminar ${tipo} con ID ${id}:`, error);
      console.error(`❌ Error al eliminar ${tipo} con ID ${id}:`, error);
      alert(`Error al eliminar el registro: ${error.response?.data?.error || error.message}`);
    }
  };



  // 🔹 Función para actualizar registros (Inline Edit)
  const handleUpdate = async (id, tipo, newData) => {
    try {
      const endpoint = tipo === 'datalogger'
        ? `consulta/datalogger/${id}`
        : tipo === 'caracterizacion'
          ? `consulta/caracterizacion/${id}`
          : `consulta/comparacion/${id}`;

      // newData debe contener { resultado: [...] }
      await iotApi.put(endpoint, newData);

      // Recargar datos tras actualización
      const { data } = await iotApi.get('consulta/all');
      if (data) {
        setConsulta({
          datalogger: data.datalogger || [],
          caracterizacion: data.caracterizacion || [],
          comparacion: data.comparacion || []
        });
      }

    } catch (error) {
      console.error(`❌ Error al actualizar ${tipo} con ID ${id}:`, error);
      alert(`Error al actualizar el registro: ${error.response?.data?.error || error.message}`);
    }
  };

  // =======================
  // SOCKETS
  // =======================
  useEffect(() => {
    if (!socket) return;

    const handleResetPlc = (data) => {
      console.log("📩 resetPlc recibido (raw):", data);
      const valor = data?.valor ?? null;

      if (valor === 0 || valor === 1) {
        setReset(valor);

        // 🧹 Si valor === 1 => limpiar y reiniciar gráfico TiempoReal
        if (valor === 1) {
          console.log("🧼 TiempoReal se reseteó por señal del PLC");
          setDatosrt([]);              // Limpia los datos en tiempo real
          setResetTiempoReal(true);    // Fuerza remount del componente
          setTimeout(() => setResetTiempoReal(false), 100);
        }
      }
    };

    const handleRespuestaPlc = (data) => setDatoshis(data);
    const handleAdcPlc = (data) => setDatosrt(data);

    // 📋 Handler for server logs
    const handleServerLog = (data) => {
      // 🛑 Filtro: Ignorar logs de Petri o Holones en esta vista
      const filterKeywords = ['Petri', 'Holon', 'hms/'];
      const hitTopic = data?.topic && filterKeywords.some(k => data.topic.includes(k));
      const hitMsg = typeof data?.msg === 'string' && filterKeywords.some(k => data.msg.includes(k));

      if (hitTopic || hitMsg) {
        return;
      }

      setServerLogs(prev => {
        const newLogs = [...prev, data];
        return newLogs.slice(-50); // Keep last 50 logs
      });

      // 🧠 Auto-refresh si detectamos guardado exitoso
      if (data && typeof data.msg === 'string' &&
        (data.msg.includes('Datos insertados') || data.msg.includes('Comparación guardada') || data.msg.includes('guardada con id'))) {
        console.log("🔄 Detectado nuevo registro en logs. Refrescando tablas...");
        cargarDatosIniciales(true); // Silent refresh
      }
    };

    socket.on("resetPlc", handleResetPlc);
    socket.on("respuestaPlc", handleRespuestaPlc);
    socket.on("adcPlc", handleAdcPlc);
    socket.on("comparacion", handleAdcPlc);
    socket.on("caracterizacion", handleAdcPlc);
    socket.on("serverLog", handleServerLog); // 🟢 Subscribe to logs

    return () => {
      socket.off("resetPlc", handleResetPlc);
      socket.off("respuestaPlc", handleRespuestaPlc);
      socket.off("adcPlc", handleAdcPlc);
      socket.off("comparacion", handleAdcPlc);
      socket.off("caracterizacion", handleAdcPlc);
      socket.off("serverLog", handleServerLog);
    };
  }, [socket]);




  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const cardStyle = { height: "400px", width: "100%" };

  // 🔹 Función de Descarga CSV
  const handleDownloadCSV = (data, selectedIds, filenamePrefix) => {
    if (!data || selectedIds.length === 0) return;

    // Filtrar y aplanar datos
    const selectedData = (Array.isArray(data) ? data : [data]).filter(
      (item) => selectedIds.includes(item.id)
    );

    if (selectedData.length === 0) return;

    // 🟢 Obtener todas las claves dinámicamente de los resultados
    const allKeys = new Set();
    selectedData.forEach((item) => {
      if (Array.isArray(item.resultado)) {
        item.resultado.forEach((r) => {
          Object.keys(r).forEach((k) => allKeys.add(k));
        });
      }
    });

    const dynamicKeys = Array.from(allKeys);
    // Ordenamiento opcional: intentar poner 'tiempo' primero si existe
    dynamicKeys.sort((a, b) => {
      if (a.toLowerCase().includes('tiempo')) return -1;
      if (b.toLowerCase().includes('tiempo')) return 1;
      return 0;
    });

    // Fallback si no hay claves
    if (dynamicKeys.length === 0) {
      dynamicKeys.push("tiempo", "voltaje", "pwm");
    }

    // Generar filas CSV
    const csvRows = [];
    // Encabezados: ID, Prueba, ...[Claves dinámicas]
    const headers = ["ID", "Prueba", ...dynamicKeys];
    csvRows.push(headers.join(","));

    selectedData.forEach((item) => {
      const prueba = item.prueba || "";
      const resultados = item.resultado || [];
      resultados.forEach((r) => {
        const row = [
          item.id,
          prueba,
          ...dynamicKeys.map((key) => r[key] ?? "")
        ];
        csvRows.push(row.join(","));
      });
    });

    // Crear Blob y descargar
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔹 Preparar datos combinados para el gráfico unificado (Overlay)
  const dataloggerDisplay = (consulta?.datalogger || []).map(d => ({ ...d, id: `Reg-${d.id}` }));
  const caracterizacionDisplay = (consulta?.caracterizacion || []).map(d => ({ ...d, id: `Car-${d.id}` }));
  const comparacionDisplay = (consulta?.comparacion || []).map(d => ({ ...d, id: `Comp-${d.id}` }));

  const combinedData = [...dataloggerDisplay, ...caracterizacionDisplay, ...comparacionDisplay];
  const combinedSelectedIds = [
    ...selectedIdsControl.map(id => `Reg-${id}`),
    ...selectedIdsCaracterizacion.map(id => `Car-${id}`),
    ...selectedIdsComparacion.map(id => `Comp-${id}`)
  ];

  return (
    <>
      <CRow className="g-4">
        {/* ===================== FILA 1 ===================== */}
        <CCol xs={12} lg={6} xl={6}>
          <CCard style={cardStyle} className="shadow-sm">
            <CCardBody ref={tiempoRealRef} className="overflow-hidden">
              {sizeRT.width > 0 && (
                <TiempoReal
                  key={resetTiempoReal ? Date.now() : "tiempo-real"} // 🔹 forzar remount
                  datosrt={datosrt}
                  width={sizeRT.width - 20}
                  height={sizeRT.height - 30}
                  reset={resetTiempoReal}
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={6} xl={6}>
          <CCard style={cardStyle} className="shadow-sm">
            <CCardBody ref={historicosRef} className="overflow-hidden">
              <Historicos
                registros={combinedData}
                selectedIds={combinedSelectedIds}
                width={sizeHist.width - 20}
                height={sizeHist.height - 30}
              />
            </CCardBody>
          </CCard>
        </CCol>

        {/* ===================== FILA 2 (TABLAS Y CONTROLES) ===================== */}
        <CCol xs={12} lg={6}>
          <CCard className="shadow-sm">
            <CCardBody>
              <CTabs activeItemKey={activeTab} onActiveItemKeyChange={setActiveTab}>
                <CTabList variant="underline-border">
                  <CTab itemKey="Registros">Registros</CTab>
                  <CTab itemKey="Caracterizacion">Caracterización</CTab>
                  <CTab itemKey="Comparacion">Comparación</CTab>
                  <CTab itemKey="Controlador">Controlador</CTab>
                </CTabList>
                <CTabContent>
                  <CTabPanel itemKey="Registros" className="p-3">
                    {/* 🆕 Estilo en línea para ocultar scrollbar pero mantener funcionalidad */}
                    <div className="tabla-contenedor-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <style>
                        {`
                          .tabla-contenedor-scroll::-webkit-scrollbar {
                            display: none;
                          }
                        `}
                      </style>
                      <TablasDatos
                        registro={consulta?.datalogger}
                        onSelectionChange={setSelectedIdsControl}
                        onDelete={(id) => handleDelete(id, 'datalogger')}
                        onUpdate={(id, newData) => handleUpdate(id, 'datalogger', newData)}
                        onDownload={(id) => handleDownloadCSV(consulta?.datalogger, [id], "datalogger")}
                      />
                    </div>
                  </CTabPanel>
                  <CTabPanel itemKey="Caracterizacion" className="p-3">
                    <div className="tabla-contenedor-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {/* Reutilizamos el estilo global inyectado arriba o añadimos clase local si fuera necesario,
                           pero con el style block anterior debería bastar si la clase es la misma */}
                      <TablasCaracterizacion
                        registro={consulta?.caracterizacion}
                        onSelectionChange={setSelectedIdsCaracterizacion}
                        onDelete={(id) => handleDelete(id, 'caracterizacion')}
                        onUpdate={(id, newData) => handleUpdate(id, 'caracterizacion', newData)}
                        onDownload={(id) => handleDownloadCSV(consulta?.caracterizacion, [id], "caracterizacion")}
                      />
                    </div>
                  </CTabPanel>
                  <CTabPanel itemKey="Comparacion" className="p-3">
                    <div className="tabla-contenedor-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <TablasComparacion
                        registro={consulta?.comparacion}
                        onSelectionChange={setSelectedIdsComparacion}
                        onDelete={(id) => handleDelete(id, 'comparacion')}
                        onUpdate={(id, newData) => handleUpdate(id, 'comparacion', newData)}
                        onDownload={(id) => handleDownloadCSV(consulta?.comparacion, [id], "comparacion")}
                      />
                    </div>
                  </CTabPanel>
                  <CTabPanel itemKey="Controlador" className="p-3">
                    <div className="h-100 d-flex flex-column">

                      <div className="tabla-contenedor-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <TablasDatos
                          registro={consulta?.datalogger}
                          onSelectionChange={setSelectedIdsControl}
                          onDelete={(id) => handleDelete(id, 'datalogger')}
                          onUpdate={(id, newData) => handleUpdate(id, 'datalogger', newData)}
                          onDownload={(id) => handleDownloadCSV(consulta?.datalogger, [id], "datalogger")}
                        />
                      </div>
                    </div>
                  </CTabPanel>
                </CTabContent>
              </CTabs>
            </CCardBody>
          </CCard>
        </CCol>

        {/* 🆕 Columna para Controles (Mitad Derecha) */}
        <CCol xs={12} lg={6}>
          <CCard className="shadow-sm" style={{ height: '100%' }}>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <CCardTitle className="m-0">Logs del Sistema</CCardTitle>
              <CButton
                color="danger"
                variant="ghost"
                size="sm"
                onClick={() => setServerLogs([])}
                title="Limpiar logs"
              >
                Limpiar
              </CButton>
            </CCardHeader>
            <CCardBody>
              <div
                className="bg-black text-white p-3 font-monospace shadow-inner"
                style={{
                  height: '230px', // 🟢 Altura ajustada a tabla (4 filas)
                  overflowY: 'auto',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' // Fuente más "hacker"
                }}
              >
                {serverLogs.length === 0 ? (
                  <span className="text-secondary">Esperando logs del servidor...</span>
                ) : (
                  serverLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>{' '}
                      {log.topic && (
                        <span className="me-2 badge bg-dark border border-secondary" style={{ fontSize: '0.7rem' }}>
                          {log.topic}
                        </span>
                      )}
                      <span
                        style={{
                          color: log.type === 'error' ? '#ff6b6b' : log.type === 'warn' ? '#fcc419' : '#69db7c'
                        }}
                      >
                        {log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️'}
                      </span>{' '}
                      {log.msg && typeof log.msg === 'string'
                        ? log.msg.split('\n').map((line, i) => <div key={i} style={{ paddingLeft: i > 0 ? '1.2rem' : 0 }}>{line}</div>)
                        : JSON.stringify(log.msg)
                      }
                    </div>
                  ))
                )}
                {/* Auto-scroll anchor */}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>

      </CRow >

      {/* 🔹 Agente Flotante Independiente */}
      < TarjetaTransparente titulo="Agente IA (Planta)" subtitulo="Asistente de Control" >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "350px",
            width: "320px",
          }}
        >
          {/* Sugerencias de Comandos */}
          <div className="d-flex gap-2 mb-2 flex-wrap justify-content-center">
            {[
              { label: 'Controlador IA', cmd: 'Controlador IA con set point de 6v y 60 s' },
              { label: 'Controlador IA Disturbio', cmd: 'Controlador IA con set point de 6v y 60 s, disturbio' },
              { label: 'Reset', cmd: 'Reset' },
              { label: 'Identificar Planta', cmd: 'Identificar Planta' },
              { label: 'Comparar Modelo', cmd: 'Comparar Modelo' },
              { label: 'Caracterizar', cmd: 'Caracterizar' },
              { label: 'Registros', cmd: 'Consultar todos los registros de la base de datos' }
            ].map((item) => (
              <CBadge
                key={item.label}
                color="info"
                shape="rounded-pill"
                style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                onClick={() => handlePost({ text: item.cmd })}
              >
                {item.label}
              </CBadge>
            ))}
          </div>

          {/* Mensajes */}
          <div
            style={{
              flexGrow: 1,
              overflowY: "auto",
              paddingRight: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "10px"
            }}
          >
            <GptMessage text="Soy tu Agente de Control experto." />
            {messages.map((m, i) =>
              m.isGpt ? <GptMessage key={i} text={m.text} /> : <MyMessage key={i} text={m.text} />
            )}
            {isLoading && (
              <div className="fade-in">
                <TypingLoader />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Caja de texto */}
          <TextMessageBox
            onSendMessage={handlePost}
            placeholder="Comando..."
            disableCorrections
          />
        </div>
      </TarjetaTransparente >
    </>
  );
};
