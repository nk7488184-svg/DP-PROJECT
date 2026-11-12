param (
    [Parameter(Mandatory=$false)]
    [string]$PiIp = "",

    [Parameter(Mandatory=$false)]
    [string]$PiUser = "pi",

    [Parameter(Mandatory=$false)]
    [string]$ServerHost = "172.18.67.167",

    [Parameter(Mandatory=$false)]
    [int]$ServerPort = 8000
)

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  RoadSentinel: Automated RPi 5 LAN Deployment Tool                " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

if ([string]::IsNullOrWhiteSpace($PiIp)) {
    $PiIp = Read-Host "Enter Raspberry Pi 5 IP address on LAN (e.g., 172.18.65.42 or 192.168.1.50)"
}

if ([string]::IsNullOrWhiteSpace($PiIp)) {
    Write-Host "[ERROR] Raspberry Pi IP address is required. Exiting." -ForegroundColor Red
    exit 1
}

$TargetDir = "/home/$PiUser/roadsentinel"

Write-Host "`n[*] Target Raspberry Pi: $PiUser@$PiIp" -ForegroundColor Yellow
Write-Host "[*] Central Server Host: $ServerHost:$ServerPort" -ForegroundColor Yellow
Write-Host "[*] Creating remote directory $TargetDir..." -ForegroundColor Yellow

ssh "$PiUser@$PiIp" "mkdir -p $TargetDir"

Write-Host "[*] Copying C++ source, build scripts, and service definitions..." -ForegroundColor Yellow
scp "$PSScriptRoot\rpi5_radar_daemon.cpp" "$PSScriptRoot\build.sh" "$PSScriptRoot\Makefile" "$PSScriptRoot\roadsentinel-radar.service" "$PiUser@$PiIp`:$TargetDir/"

Write-Host "[*] Compiling on Raspberry Pi 5 with -O3 optimizations..." -ForegroundColor Yellow
ssh "$PiUser@$PiIp" "cd $TargetDir && chmod +x build.sh && ./build.sh"

Write-Host "`n====================================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] Deployment & Compilation Complete!                       " -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "`nTo start live demonstration on the Raspberry Pi:"
Write-Host "  ssh $PiUser@$PiIp"
Write-Host "  cd $TargetDir"
Write-Host "  ./rpi5_radar_daemon --host $ServerHost --port $ServerPort --demo"
Write-Host ""
