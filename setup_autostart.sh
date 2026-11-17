#!/bin/bash
# ==============================================================================
# RoadSentinel - Raspberry Pi Plug & Play Auto-Start Setup
# ==============================================================================
# Sets up RoadSentinel as a background systemd service.
# Automatically starts on power-on when connected to battery/power and internet.
# Zero commands required in future.
# ==============================================================================

set -e

USER_NAME=$(whoami)
USER_HOME=$(eval echo "~$USER_NAME")
SCRIPT_PATH="$USER_HOME/rpi_camera_edge.py"
SERVICE_FILE="/etc/systemd/system/roadsentinel.service"

echo "=================================================================="
echo " RoadSentinel Plug & Play Appliance Setup (Auto-Boot Service)"
echo " User: $USER_NAME | Home: $USER_HOME"
echo "=================================================================="

# 1. Download latest edge client
echo "[1/4] Fetching latest RoadSentinel Edge Client from GitHub..."
curl -sSL https://raw.githubusercontent.com/nk7488184-svg/DP-PROJECT/main/rpi_camera_edge.py -o "$SCRIPT_PATH"
chmod +x "$SCRIPT_PATH"

# 2. Check and install python dependencies if needed
echo "[2/4] Verifying Python dependencies..."
python3 -c "import requests" 2>/dev/null || sudo apt-get install -y python3-requests python3-serial

# 3. Create systemd service
echo "[3/4] Creating auto-boot service at $SERVICE_FILE..."
sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=RoadSentinel Camera & Doppler Radar Edge Node
After=network-online.target time-sync.target
Wants=network-online.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$USER_HOME
ExecStart=/usr/bin/python3 $SCRIPT_PATH --fps 10
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 4. Enable and start service
echo "[4/4] Enabling and starting RoadSentinel service on boot..."
sudo systemctl daemon-reload
sudo systemctl enable roadsentinel.service
sudo systemctl restart roadsentinel.service

echo ""
echo "=================================================================="
echo " ✅ SETUP COMPLETE! RoadSentinel is now a 100% Plug & Play Unit!"
echo "=================================================================="
echo "Ab aapko kabhi bhi terminal pe command run karne ki zaroorat nahi."
echo "Jaise hi aap Pi ko power aur internet doge, yeh automatically:"
echo "  1. Camera Module 3 (Continuous PDAF Autofocus) shuru kar dega."
echo "  2. 24GHz Doppler Radar connect karke speeds monitor karega."
echo "  3. Har overspeeding car ki photo & details sidha Google Drive me bhejega."
echo "  4. 16GB SD card par 0 bytes write honge (100% RAM streaming)."
echo ""
echo "Service status check karne ke liye: sudo systemctl status roadsentinel"
echo "Live logs dekhne ke liye:           journalctl -u roadsentinel -f"
echo "=================================================================="
