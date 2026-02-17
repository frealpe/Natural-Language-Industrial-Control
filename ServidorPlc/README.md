# PLC Server (Raspberry Pi Backend)

This component runs directly on the Raspberry Pi (Industrial Shields RPIPLC V6) and handles direct hardware interaction (Inputs/Outputs, ADC, PWM) and local communication.

## Hardware
*   **Model**: Industrial Shields RPIPLC V6 (Raspberry Pi)
*   **Default IP**: `172.21.61.193`
*   **User/Pass**: `pi` / `raspberry`

## Prerequisites

1.  **Node.js & node-gyp**: Required to compile the C++ wrapper (`rpiplc-addon`).
2.  **Industrial Shields Libraries**: `librpiplc` installed on the system.
3.  **MQTT Broker**: Mosquitto installed and running locally.

## Installation

1.  Clone the repository onto the Raspberry Pi.
2.  Install dependencies and compile the native addon:

```bash
npm install
```

> **Note**: The `npm install` process will automatically execute `node-gyp rebuild` to compile the `rpiplc` module located in `rpiplc-addon/`. If it fails, ensure you have the C libraries installed (see Reference section).

## Configuration

Create a `.env` file in the root directory based on the example:

```bash
cp .example.env .env
```
Edit the `.env` file with your specific configuration (IPs, credentials, etc.).


## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

---

# System Configuration (Reference)

## 1. Initial Raspberry Pi Configuration
*   **SD Images**: [Industrial Shields Images](https://apps.industrialshields.com/main/rpi/images/RPI_PLC/)
*   **First Steps**:
    *   Change password (`passwd`).
    *   Enable VNC (`sudo raspi-config`).
    *   Verify model: `cat /proc/device-tree/model`

## 2. Installing C Libraries (librpiplc)
For the server to function, the base C libraries must be installed:

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

## 3. MQTT Configuration (Mosquitto)
Install broker for internal communication:

```bash
sudo apt install mosquitto mosquitto-clients -y
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```
**Configure ACLs and users** as needed in `/etc/mosquitto/`.

## 4. OpenPLC (Optional)
If OpenPLC is required:
*   [Linux Installer](https://autonomylogic.com/download-linux)
*   On RPi: `git clone https://github.com/thiagoralves/OpenPLC_v3.git && ./install.sh rpi`