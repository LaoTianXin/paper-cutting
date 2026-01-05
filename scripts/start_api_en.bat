@echo off
chcp 65001 >nul
echo ========================================
echo   Porcelain AI - API Server Launcher
echo ========================================
echo.

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found
    echo [INFO] Copying .env.example to .env...
    echo.
    copy ".env.example" ".env" >nul
    echo [DONE] .env file created. Please configure it.
    echo.
    pause
)

echo [1/3] Checking dependencies...
pip show fastapi >nul 2>&1
set fastapi_installed=%errorlevel%
pip show python-dotenv >nul 2>&1
set dotenv_installed=%errorlevel%

if %fastapi_installed% neq 0 (
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
) else if %dotenv_installed% neq 0 (
    echo [INFO] Installing missing dependencies...
    pip install -r requirements.txt
) else (
    echo [OK] Dependencies installed
)

echo.
echo [2/3] Checking ComfyUI connection...
python check_comfyui.py
if errorlevel 1 (
    echo [WARNING] Cannot connect to ComfyUI service
    echo [INFO] Please check COMFYUI_URL in .env file
    echo.
    echo Press any key to continue or Ctrl+C to cancel...
    pause >nul
) else (
    echo [OK] ComfyUI connected
)

echo.
echo [3/3] Starting API server...
echo.
echo ========================================
echo   API Service: http://localhost:8080
echo   API Docs: http://localhost:8080/docs
echo   Health Check: http://localhost:8080/api/health
echo ========================================
echo.

python api_server.py

pause
