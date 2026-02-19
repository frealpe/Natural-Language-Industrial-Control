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
*   Plataformas educativas de automatización.

---

## 🔬 Resumen Científico

### 1. Importancia y Problemas Científicos Solucionados
**LLMControl** es fundamental porque democratiza la automatización industrial avanzada, permitiendo que operadores sin conocimientos profundos en lenguajes de programación de bajo nivel interactúen con sistemas físicos complejos mediante lenguaje natural.

**Problemas Científicos Resueltos:**
*   **Interacción Humano-Máquina (HMI) Cognitiva:** Resuelve el desafío de mapear instrucciones semánticas ambiguas hacia comandos de control precisos y deterministas.
*   **Síntesis Automática de Control:** Automatiza la transición entre requisitos operativos y la implementación física de leyes de control ajustadas algorítmicamente.
*   **Seguridad en Sistemas Concurrentes:** Garantiza la coherencia operativa mediante el uso de **Redes de Petri** para validar la lógica propuesta por la IA antes de su ejecución.

### 2. Contribución al Proceso de Descubrimiento Científico
El software contribuye al avance de la **Industria 5.0**, facilitando la investigación en sistemas industriales "auto-conscientes" que pueden caracterizar su propio hardware e identificar sus dinámicas internas de forma autónoma. 

*   **Línea de Investigación:** Integración de Modelos de Lenguaje de Gran Escala (LLM) con control de procesos basado en estados y eventos concurrentes.
*   **Institución vinculada:** Departamento de Electrónica, Instrumentación y Control de la **Universidad del Cauca**.

### 3. Configuración del Entorno Experimental
El entorno experimental típico consiste en un PLC industrial basado en **Raspberry Pi** conectado a sensores y actuadores físicos (ej. sistemas de nivel, presión o temperatura).

**Flujo de Uso para el Investigador/Usuario:**
1.  **Entrada Semántica:** El usuario solicita un objetivo de control en lenguaje natural a través de la interfaz web.
2.  **Orquestación Inteligente:** El servidor de IA analiza datos históricos y realiza el ciclo de Caracterización -> Identificación -> Simulación.
3.  **Ejecución Física:** El sistema genera un controlador (PI u otro) y envía las señales de control vía **MQTT** al hardware, cerrando el lazo de control en tiempo real.
4.  **Monitoreo:** Los resultados se visualizan dinámicamente mediante **Vega-Lite**, permitiendo validar la hipótesis de control planteada.
