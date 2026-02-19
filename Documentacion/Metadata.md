# Información del Proyecto - LLMControl V3

### 🛠️ Detalles Generales
*   **Versión actual**: V3 (3.0.0)
*   **Repositorio**: [https://github.com/frealpe/Natural-Language-Industrial-Control](https://github.com/frealpe/Natural-Language-Industrial-Control)
*   **Licencia**: MIT
*   **Sistema de Versiones**: Git

### 💻 Stack Tecnológico
*   **Lenguajes**: JavaScript (Node.js, React), C++ (Addons), HTML5, CSS3, SQL.
*   **Frontend**: React (Vite + CoreUI Pro), Vega-Lite, Redux, Zustand, Socket.io-client.
*   **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB), pg (PostgreSQL).
*   **Industria/Hardware**: Raspberry Pi (Industrial Shields RPIPLC), MQTT (Mosquitto), OPC UA.
*   **IA**: OpenAI API, Local LLMs (Ollama/DeepSeek).

### ⚙️ Requisitos de Entorno y Compilación
*   **Entorno**: Node.js 16+, G++/GCC & Make (para Addons de C++).
*   **Bases de Datos**: MongoDB, PostgreSQL (activas).
*   **Broker**: Mosquitto MQTT (Puerto 1883).
*   **Sistema Operativo (PLC)**: Raspberry Pi OS (Linux).
*   **Visualización**: Navegador Web (Chrome/Firefox/Edge).

### 📧 Soporte
*   **Contacto**: fabio.realpe@unicauca.edu.co

---

## 🏗️ Arquitectura del Proyecto

### 1. Hardware Industrial
El sistema utiliza un **PLC basado en Raspberry Pi industrial**, encargado de la adquisición y control de señales físicas mediante interfaces **GPIO, ADC y PWM/DAC**.

### 2. Servidor de Inteligencia
El servidor central integra modelos de lenguaje (**LLMs**) para el procesamiento de solicitudes en lenguaje natural y coordina el flujo de datos mediante protocolos **MQTT y WebSockets**. Asimismo, realiza análisis de datos históricos almacenados en bases de datos **PostgreSQL y MongoDB**.

### 3. Interfaz de Usuario
La interacción se realiza mediante una aplicación web moderna desarrollada en **React**, donde los usuarios pueden emitir solicitudes en lenguaje natural para monitorear y controlar procesos industriales.

## ⚙️ Tecnologías y Algoritmos Utilizados

### 1. Modelado de Procesos
Se emplean **Redes de Petri** para el control lógico secuencial y concurrente, garantizando seguridad operativa y coherencia en la ejecución de acciones.

### 2. Análisis de Datos
El procesamiento de datos experimentales se realiza mediante herramientas de análisis estadístico y regresión implementadas con bibliotecas como **Danfo.js** y **Simple-Statistics**.

### 3. Protocolos de Comunicación
La interoperabilidad se logra mediante protocolos industriales estándar como **OPC UA y MQTT**, fundamentales en entornos IoT industriales.

### 4. Visualización
La representación gráfica de estados y predicciones se realiza mediante la gramática declarativa **Vega-Lite**.

## 🔄 Automatización del Ciclo de Control Industrial
LLMControl automatiza las cuatro fases críticas del diseño de control (caracterización, identificación, simulación y control) mediante agentes inteligentes.

### 1. Caracterización Automática
El sistema inicializa automáticamente el hardware, valida conexiones y ajusta parámetros de adquisición sin intervención manual.

### 2. Identificación Adaptativa
Los datos experimentales se almacenan estructuradamente, permitiendo la selección automática del modelo dinámico más representativo del sistema.

### 3. Simulación y Control Autónomo
El agente genera y valida modelos de control **PI** mediante simulaciones internas antes de su implementación en el sistema físico, eliminando ciclos manuales de prueba y error.

## 🚀 Impacto y Aplicaciones
LLMControl representa un nuevo paradigma en automatización industrial: el **Control Cognitivo Autónomo**.

**Aplicaciones potenciales:**
*   Sistemas de manufactura inteligente.
*   Procesos industriales auto-configurables.
*   Laboratorios remotos de control.
*   Plataformas educativas de automatización.
