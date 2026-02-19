# Natural Language Industrial Control (LLMControl) V3

This project implements an advanced industrial control system that integrates Natural Language Processing (NLP), Artificial Intelligence (AI), and standard industrial protocols (MQTT, OPC UA) to monitor and control processes using a Raspberry Pi-based PLC.

## 🏗 System Architecture

The system is organized as a monorepo with three main components:

### 1. Frontend (`Plc/`)
*   **Technology**: React (Vite + CoreUI).
*   **Role**: Provides the graphical user interface for operators. Features real-time charts (Vega-Lite), control panels, and AI chat interfaces.
*   **Communication**: Connects to the PC Server via REST API and WebSockets.

### 2. PC Server (`ServidorPc/`)
*   **Technology**: Node.js, Express, MongoDB, PostgreSQL.
*   **Role**: Acts as the central brain. It manages business logic, data storage (historical and configuration), and orchestrates communication between the UI, AI agents, and the hardware.
*   **Communication**:
    *   **Northbound**: REST/WS to Frontend.
    *   **Southbound**: MQTT to PLC.
    *   **AI**: Integrates with OpenAI and local LLMs for intelligent analysis.

### 3. PLC Server (`ServidorPlc/`)
*   **Hardware**: Industrial Shields RPIPLC V6 (Raspberry Pi based).
*   **Technology**: Node.js, C++ Addons (`rpiplc-addon`).
*   **Role**: Handles direct hardware interaction (GPIO, ADC, PWM, Relays). It reads sensors and executes control commands.
*   **Communication**: Publishes sensor data and subscribes to commands via MQTT.

## 🚀 Quick Start Guide

Follow these steps to start the complete system.

### Prerequisites
*   Node.js & npm
*   Mosquitto MQTT Broker (Port 1883)
*   MongoDB & PostgreSQL databases running
*   Raspberry Pi (Industrial Shields model) for the PLC component

### 1. Start PC Server (Backend)
```bash
cd ServidorPc
npm install  # First time only
npm start
```

### 2. Start PLC Server (Hardware)
*Run this on the Raspberry Pi.*
```bash
cd ServidorPlc
npm install  # First time only
npm start
```

### 3. Start Frontend (UI)
```bash
cd Plc
npm install  # First time only
npm start
```
Access the application at `http://localhost:5173`.

## 📡 Communication Flow

1.  **Monitoring**: `ServidorPlc` reads sensors -> Publishes to MQTT -> `ServidorPc` processes & saves to DB -> Pushes via WebSocket -> `Plc` (UI) updates charts.
2.  **Control**: User clicks button in `Plc` (UI) -> Request to `ServidorPc` -> Publishes command to MQTT -> `ServidorPlc` triggers physical relay.

## 🛠 Tech Stack

*   **Frontend**: React, Vite, CoreUI, Vega-Lite, Socket.io-client
*   **Backend**: Node.js, Express, Socket.io, Mongoose (MongoDB), pg (PostgreSQL)
*   **Hardware Interface**: Custom C++ Node.js Addon (`rpiplc-addon`), Industrial Shields Libraries
*   **Protocols**: MQTT, OPC UA, HTTP, WebSocket
*   **AI**: OpenAI API, Local LLMs (via Ollama/DeepSeek)
