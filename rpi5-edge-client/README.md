# RoadSentinel — Raspberry Pi 5 Edge Radar Client (C++17)

## Overview & Architecture Narrative

In response to hardware constraints (Raspberry Pi 5 with 1GB RAM) and strict privacy regulations, **RoadSentinel** deploys a **Zero-Storage Edge Sensing Architecture**:

1. **Memory & CPU Efficiency**:
   - Written in modern, zero-heap **C++17** and compiled with `-O3` and `-march=native`.
   - Runs in **under 5 MB RAM** without dynamic heap fragmentation.
2. **Zero-Storage Privacy Policy**:
   - Because high-resolution camera frames exhaust constrained edge flash storage and pose privacy risks, **no raw photographic frames are saved on the edge node**.
   - Violation tickets carry **Doppler radar-verified velocity metrics**, while registration plates are rendered cleanly and synthetically following official Indian High-Security Registration Plate (HSRP) formats (`HP 33 B 4921`, etc.).
3. **Dual Radar Support**:
   - **UART / Serial Radar**: Reads continuous Doppler speed sentences from `/dev/ttyUSB0` or `/dev/serial0` (e.g. 24GHz HLK-LD2410, LD2415H, OPS24x).
   - **Live Bench / Demonstration Mode**: When no physical vehicle is in range or during indoor demonstrations, `--demo` mode generates realistic campus hill traffic (speeds strictly capped $\le 44.8\text{ km/h}$, posted limit $20.0\text{ km/h}$).

---

## Folder Structure

```
rpi5-edge-client/
├── rpi5_radar_daemon.cpp      # Ultra-optimized C++17 radar daemon
├── build.sh                   # Automatic dependency install & compilation script
├── Makefile                   # Standard Makefile for build/install
├── roadsentinel-radar.service # Systemd service for auto-start on boot
├── deploy_to_pi.ps1           # 1-Click LAN deployment script for Windows PowerShell
├── deploy_to_pi.sh            # 1-Click LAN deployment script for Linux/macOS
└── README.md                  # This guide
```

---

## 1-Click Deployment Over LAN

### Option A: From Windows (PowerShell)
Open PowerShell in this directory:
```powershell
cd C:\Users\nk748\OneDrive\Desktop\DP-PROJECT\rpi5-edge-client
.\deploy_to_pi.ps1 -PiIp <RASPBERRY_PI_IP>
```
*(Example: `.\deploy_to_pi.ps1 -PiIp 172.18.65.42 -ServerHost 172.18.67.167`)*

### Option B: Manual Setup on Raspberry Pi
1. Copy or clone this folder onto your Raspberry Pi 5:
   ```bash
   git clone https://github.com/nk7488184-svg/DP-PROJECT.git
   cd DP-PROJECT/rpi5-edge-client
   ```
2. Build the binary:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```
3. Run the daemon:
   - **For Live Indoor / Desk Demonstration:**
     ```bash
     ./rpi5_radar_daemon --host 172.18.67.167 --port 8000 --demo
     ```
   - **With Physical Serial Doppler Radar:**
     ```bash
     ./rpi5_radar_daemon --host 172.18.67.167 --port 8000 --serial /dev/ttyUSB0 --baud 115200
     ```

---

## Command-Line Arguments

| Flag | Default | Description |
|---|---|---|
| `--host <IP>` | `127.0.0.1` | IP address of your central FastAPI server (your laptop's LAN IP: `172.18.67.167`) |
| `--port <PORT>` | `8000` | Port of the FastAPI backend |
| `--serial <DEV>` | `/dev/ttyUSB0` | Linux serial port device node for 24GHz radar |
| `--baud <RATE>` | `115200` | Baud rate of the radar sensor |
| `--limit <KM/H>` | `20.0` | Posted speed limit in km/h (hilly campus corridor) |
| `--interval <S>` | `60` | Telemetry aggregation interval in seconds |
| `--demo` | `false` | Generates realistic test traffic for bench/desk presentations |

---

## Running as a Background Daemon (`systemd`)

To keep RoadSentinel running continuously even after reboot:
```bash
sudo make install
sudo systemctl start roadsentinel-radar.service
sudo systemctl status roadsentinel-radar.service
```
