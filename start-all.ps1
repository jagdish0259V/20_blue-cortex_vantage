# Vantage - Start AI Service & Frontend
# Usage: .\start-all.ps1

Write-Host ""
Write-Host "========================================"
Write-Host "  Starting Vantage AI-Service & Frontend"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start AI Service
Write-Host "Starting AI Service on port 8000..." -ForegroundColor Cyan
$aiServiceProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$($scriptDir)\ai-service'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# Wait for AI service to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Cyan
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$($scriptDir)\Vantiage frontend'; npm run dev" -PassThru

Write-Host ""
Write-Host "========================================"
Write-Host "  Services Starting..." -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "AI Service:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend:    http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Close the terminal windows to stop the services." -ForegroundColor Gray
Write-Host ""

# Wait for both processes
$aiServiceProcess, $frontendProcess | Wait-Process
