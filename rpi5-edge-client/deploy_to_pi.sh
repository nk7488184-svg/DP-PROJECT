#!/usr/bin/env bash
# ==============================================================================
# RoadSentinel: Automated RPi 5 LAN Deployment (Bash)
# ==============================================================================
set -e

PI_IP="${1:-}"
PI_USER="${2:-pi}"
SERVER_HOST="${3:-172.18.67.167}"
SERVER_PORT="${4:-8000}"

if [ -z "$PI_IP" ]; then
    read -p "Enter Raspberry Pi 5 IP address on LAN: " PI_IP
fi

if [ -z "$PI_IP" ]; then
    echo "[ERROR] Raspberry Pi IP address is required."
    exit 1
fi

TARGET_DIR="/home/$PI_USER/roadsentinel"

echo "===================================================================="
echo "  Deploying RoadSentinel to $PI_USER@$PI_IP:$TARGET_DIR             "
echo "===================================================================="

ssh "$PI_USER@$PI_IP" "mkdir -p $TARGET_DIR"
scp rpi5_radar_daemon.cpp build.sh Makefile roadsentinel-radar.service "$PI_USER@$PI_IP:$TARGET_DIR/"
ssh "$PI_USER@$PI_IP" "cd $TARGET_DIR && chmod +x build.sh && ./build.sh"

echo ""
echo "===================================================================="
echo "  [SUCCESS] Deployment & Compilation Complete!                       "
echo "===================================================================="
echo "Run on the Raspberry Pi:"
echo "  ssh $PI_USER@$PI_IP"
echo "  cd $TARGET_DIR"
echo "  ./rpi5_radar_daemon --host $SERVER_HOST --port $SERVER_PORT --demo"
echo ""
