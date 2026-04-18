#!/bin/bash

# Dopamine Box Multiplayer Launcher
# This script starts both the server and client

echo "🎮 Starting Dopamine Box Multiplayer..."
echo ""

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Check if client dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing client dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting server and client..."
echo ""
echo "Server will run on: http://localhost:3001"
echo "Client will run on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start server in background
cd server && npm run dev &
SERVER_PID=$!

# Wait a bit for server to start
sleep 2

# Start client
cd ..
npm run dev &
CLIENT_PID=$!

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
