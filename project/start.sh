#!/bin/bash
# Start script for Indian Cabs project

echo "=========================================="
echo "🚀 Starting Indian Cabs System"
echo "=========================================="
echo "🔹 Frontend: Vanilla HTML5, Tailwind CSS, JavaScript"
echo "🔹 Backend: Mock Simulation Engine (mock-backend.js)"
echo "🔹 Database: Browser LocalStorage (Persistence Layer)"
echo "=========================================="

# Check Python environment for local server
if which python3 > /dev/null 2>&1; then
    echo "✅ Python3 runtime detected"
else 
    echo "⚠️ Python3 not found. Falling back to direct browser launch."
fi

# Open index.html in the default browser
if which open > /dev/null 2>&1; then
    open index.html
elif which xdg-open > /dev/null 2>&1; then
    xdg-open index.html
else
    echo "ℹ️ Please open index.html directly in your web browser."
fi

echo "🌐 Starting local web server at http://localhost:8000"
echo "📌 Press Ctrl+C to stop the server"
echo "=========================================="

python3 -m http.server 8000
