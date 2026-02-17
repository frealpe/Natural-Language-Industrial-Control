#!/bin/bash
# Script para actualizar .env con la configuración centralizada de IP

ENV_FILE=".env"
ENV_BACKUP=".env.backup"

echo "🔧 Actualizando configuración de .env..."

# Crear backup
cp "$ENV_FILE" "$ENV_BACKUP"
echo "✅ Backup creado en $ENV_BACKUP"

# Tu IP actual
SERVER_IP="10.96.170.180"

# Agregar SERVER_IP si no existe
if ! grep -q "^SERVER_IP=" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# 🌐 IP CENTRALIZADA" >> "$ENV_FILE"
    echo "SERVER_IP=$SERVER_IP" >> "$ENV_FILE"
    echo "✅ Agregada variable SERVER_IP"
fi

# Actualizar BROKER para usar interpolación
if grep -q "^BROKER=" "$ENV_FILE"; then
    sed -i "s|^BROKER=.*|BROKER=mqtt://\${SERVER_IP}:1883|" "$ENV_FILE"
    echo "✅ Actualizada variable BROKER"
fi

# Actualizar OPC_ENDPOINT para usar interpolación
if grep -q "^OPC_ENDPOINT=" "$ENV_FILE"; then
    sed -i "s|^OPC_ENDPOINT=.*|OPC_ENDPOINT=opc.tcp://\${SERVER_IP}:4334/Plc/PlcOpcServer|" "$ENV_FILE"
    echo "✅ Actualizada variable OPC_ENDPOINT"
fi

# Actualizar SOCKET_SERVER_URL para usar interpolación
if grep -q "^SOCKET_SERVER_URL=" "$ENV_FILE"; then
    sed -i "s|^SOCKET_SERVER_URL=.*|SOCKET_SERVER_URL=http://\${SERVER_IP}:8080|" "$ENV_FILE"
    echo "✅ Actualizada variable SOCKET_SERVER_URL"
fi

echo ""
echo "🎉 ¡Configuración actualizada!"
echo "📋 Ahora solo necesitas cambiar SERVER_IP cuando tu IP cambie"
echo "🔄 Reinicia el servidor para aplicar los cambios: npm run dev"
