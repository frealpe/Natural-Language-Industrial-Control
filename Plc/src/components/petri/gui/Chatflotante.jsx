import React, { useRef, useState } from "react";
import TarjetaTransparente from "../tarjeta/TarjetaTransparente"; // tu componente draggable
import GptMessage from "../../chat-bubbles/GptMessage";
import MyMessage from "../../chat-bubbles/MyMessage";
import TypingLoader from "../../loaders/TypingLoader";
import TextMessageBox from "../../chat-input-boxes/TextMessageBox";

const ChatFlotante = ({ messages, handlePost, isLoading })=> {
  const messagesEndRef = useRef(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <TarjetaTransparente titulo="DEIC 1.0 Chat" subtitulo="Asistente IA">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "300px", // altura de la tarjeta
          width:"100"
        }}
      >
        {/* Mensajes */}
        <div
          style={{
            flexGrow: 1,
            overflowY: "auto",
            paddingRight: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <GptMessage text="Hola, soy DEIC 1.0, el primer agente de inteligencia artificial de Industria 5.0 de la Universidad del Cauca." />
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
          placeholder="Escribe aquí lo que deseas"
          disableCorrections
        />
      </div>
    </TarjetaTransparente>
  );
}
export default ChatFlotante;