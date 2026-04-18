@echo off
REM Dopamine Box Multiplayer Launcher (Windows)
REM This script starts both the server and client

echo 🎮 Starting Dopamine Box Multiplayer...
echo.

REM Check if server dependencies are installed
if not exist "server\node_modules" (
    echo 📦 Installing server dependencies...
    cd server
    call npm install
    cd ..
)

REM Check if client dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing client dependencies...
    call npm install
)

REM Check if .env exists
if not exist ".env" (
    echo ⚙️  Creating .env file...
    copy .env.example .env
)

echo.
echo ✅ Setup complete!
echo.
echo 🚀 Starting server and client...
echo.
echo Server will run on: http://localhost:3001
echo Client will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop
echo.

REM Start server in new window
start "Dopamine Box Server" cmd /k "cd server && npm run dev"

REM Wait a bit for server to start
timeout /t 2 /nobreak >nul

REM Start client in new window
start "Dopamine Box Client" cmd /k "npm run dev"

echo.
echo ✅ Both servers started in separate windows!
echo Close the windows to stop the servers.
pause
