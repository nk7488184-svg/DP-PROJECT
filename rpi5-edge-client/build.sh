#!/usr/bin/env bash
# ==============================================================================
# RoadSentinel RPi 5 Radar Edge Build Script
# Target: Raspberry Pi 5 (Raspberry Pi OS 64-bit Bookworm / Debian)
# ==============================================================================
set -e

echo "===================================================================="
echo "  RoadSentinel: Compiling Ultra-Optimized RPi 5 Edge Radar Daemon   "
echo "===================================================================="

# Check and install dependencies if missing
if ! command -v g++ &> /dev/null || ! pkg-config --exists libcurl &> /dev/null; then
    echo "[*] Installing build prerequisites (g++, libcurl4-openssl-dev)..."
    sudo apt update
    sudo apt install -y build-essential g++ libcurl4-openssl-dev pkg-config
fi

echo "[*] Compiling rpi5_radar_daemon.cpp with -O3 optimizations..."
g++ -std=c++17 -O3 -Wall -Wextra -pthread rpi5_radar_daemon.cpp -o rpi5_radar_daemon -lcurl

echo ""
echo "===================================================================="
echo "  [SUCCESS] Binary compiled: ./rpi5_radar_daemon                   "
echo "===================================================================="
echo ""
echo "Quick Start Commands:"
echo "  1. Test in Demo/Bench Mode (Live demonstration without road):"
echo "     ./rpi5_radar_daemon --host 172.18.67.167 --port 8000 --demo"
echo ""
echo "  2. Run with Physical Serial Doppler Radar (/dev/ttyUSB0 or /dev/serial0):"
echo "     ./rpi5_radar_daemon --host 172.18.67.167 --port 8000 --serial /dev/ttyUSB0 --baud 115200"
echo ""
