@echo off
title RoadSentinel Orchestrator
color 0A
echo ===================================================================
echo             ROADSENTINEL - SMART ROAD SAFETY ECOSYSTEM
echo ===================================================================
echo  Starting all backend services, ML engines, and web applications...
echo ===================================================================

:: 1. Start FastAPI ML & Edge Camera Ingestion (Port 8000)
echo [1/4] Launching FastAPI ML Engine & Live Video Ingestion (Port 8000)...
start "RoadSentinel - FastAPI ML Engine [8000]" cmd /k "cd /d "%~dp0fastapi-backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

:: 2. Start Express Backend API (Port 3002)
echo [2/4] Launching Express Core Backend API (Port 3002)...
start "RoadSentinel - Express Backend API [3002]" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 2 /nobreak > nul

:: 3. Start Campus Safety Admin Dashboard (Port 3000)
echo [3/4] Launching Campus Safety Admin Dashboard (Port 3000)...
start "RoadSentinel - Admin Dashboard [3000]" cmd /k "cd /d "%~dp0campus-safety-dashboard" && npm run dev -- -p 3000"

timeout /t 2 /nobreak > nul

:: 4. Start Citizen Public Safety Portal (Port 3001)
echo [4/4] Launching Citizen Public Reporting Website (Port 3001)...
start "RoadSentinel - Citizen Website [3001]" cmd /k "cd /d "%~dp0campus-safety-website" && npm run dev -- -p 3001"

echo.
echo ===================================================================
echo                      ALL SERVICES ACTIVE!
echo ===================================================================
echo  * Admin Dashboard   : http://localhost:3000
echo    - Live Camera Feed: http://localhost:3000/dashboard/camera
echo    - Speed Enforce   : http://localhost:3000/dashboard/enforcement
echo  * Citizen Portal    : http://localhost:3001
echo  * Express Backend   : http://localhost:3002/api
echo  * FastAPI ML Docs   : http://localhost:8000/docs
echo ===================================================================
echo.
echo NOTE for Raspberry Pi: To connect RPi across external networks:
echo   Run: cloudflared tunnel --protocol http2 --url http://127.0.0.1:8000
echo.
pause
