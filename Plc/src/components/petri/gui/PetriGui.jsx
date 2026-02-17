import React, { useContext, useEffect, useState, useRef } from "react";
import { CCard, CCardBody, CRow, CCol } from "@coreui/react-pro";
import { SocketContext } from "../../../context/SocketContext";
import { useInteligenciaStore } from "../../../hook/inteligencia/useInteligencia";
import ChatFlotante from "./Chatflotante";
import PetriMatrixJsonCard from "./PetriMatrixJsonCard";
import PetriEditorCard from "./PetriEditorCard";

const PetriGui = () => {
  const { envioMensajeIA } = useInteligenciaStore();
  const { socket } = useContext(SocketContext);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonResponse, setJsonResponse] = useState(null);

  // Drag para la tarjeta principal (opcional)
  const [pos, setPos] = useState({ x: 10, y: 50 });
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });


  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y });
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  // =======================
  // CHAT HANDLER
  // =======================
  const handlePost = async (mensaje) => {
    if (!mensaje?.text?.trim() && !mensaje?.file) return;

    const mensajeNormalizado = {
      text: mensaje.text?.trim() || "",
      file: mensaje.file || null,
    };

    // 📥 Si el mensaje tiene archivo JSON, lo cargamos
    if (mensajeNormalizado.file) setJsonResponse(mensajeNormalizado.file);

    console.log("Enviando mensaje a IA:", mensajeNormalizado);
    const { conversacion, resultado, tipo } = await envioMensajeIA({ mensaje: mensajeNormalizado });
    console.log("Respuesta IA:", { conversacion, resultado, tipo });
    setMessages((prev) => [
      ...prev,
      { text: mensajeNormalizado.text, isGpt: false },
      { text: conversacion, isGpt: true },
    ]);
  };

  return (
    <CCard
      style={{
        height: "72vh",
        width: "99vw",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CCardBody style={{ flex: 1, padding: "1px", overflowY: "auto" }}>
        {jsonResponse && (
          <CRow>
            
            <CCol md={4}>
              <PetriEditorCard initialJson={jsonResponse} setJson={setJsonResponse} />
            </CCol> 
          </CRow>
        )}
      </CCardBody>

      {/* 💬 Chat flotante abajo */}
      <ChatFlotante messages={messages} handlePost={handlePost} isLoading={isLoading} />
    </CCard>
  );
};

export default PetriGui;
