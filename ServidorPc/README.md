# PC Server (Backend)

This is the main server of the project, running on the PC. It handles the core business logic, database communication, and orchestration between the Frontend and the PLC.

## Prerequisites

*   **Node.js**: v16 or higher.
*   **Databases**:
    *   MongoDB
    *   PostgreSQL
*   **MQTT Broker**: Mosquitto (or compatible) running on port 1883.

## Installation

Install the project dependencies:

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory using the provided example:

```bash
cp .example.env .env
```

Configure the necessary environment variables in `.env`, such as database connections, MQTT broker details, and ports.


## Execution

### Development Mode
To run with `nodemon` (automatic restart on changes):

```bash
npm run dev
```

### Production Mode
To start the server normally:

```bash
npm start
```

---

# Technical Reference: RPIPLC V6 Configuration

*The following information is a reference for configuring the Raspberry Pi (used in the `ServidorPlc` component), but is kept here as backup documentation.*

## 📡 Initial Raspberry Pi Connection

- Default User: `pi`
- Default Password: `raspberry`
- SSH Connection: `ssh pi@<IP>`

### First Steps on RPi
1. Change SSH password.
2. Enable VNC graphical interface.
3. Install Industrial Shields packages.
4. Define static IP (`sudo raspi-config`).

## ⚙️ C Routines (Reference)

### Installing `librpiplc`
```bash
sudo apt update
sudo apt install git cmake build-essential -y
git clone https://github.com/Industrial-Shields/librpiplc.git
cd librpiplc
cmake -B build/ -DPLC_VERSION=RPIPLC_V6 -DPLC_MODEL=RPIPLC_58
cmake --build build/ -- -j$(nproc)
sudo cmake --install build/
sudo ldconfig
```

## 🐍 Python Routines (Reference)
Consult [python3-librpiplc](https://github.com/Industrial-Shields/python3-librpiplc/releases/tag/v4.0.1) for version V6.

## 📡 MQTT (General Installation)
```bash
sudo apt install mosquitto mosquitto-clients -y
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```