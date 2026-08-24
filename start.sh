#!/bin/bash

# Colors for output formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}      Starting Cab Booking System Servers       ${NC}"
echo -e "${BLUE}=================================================${NC}"

# Exit handler to kill background servers when user presses Ctrl+C
cleanup() {
    echo -e "\n${YELLOW}Stopping backend and frontend servers...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    echo -e "${GREEN}Servers stopped successfully.${NC}"
    exit 0
}

# Trap Ctrl+C (SIGINT) and exit (SIGTERM)
trap cleanup SIGINT SIGTERM

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo -e "${RED}Error: PHP is not installed or not in PATH.${NC}"
    exit 1
fi

# Check if Node is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: Node/npm is not installed or not in PATH.${NC}"
    exit 1
fi

# Start Backend
echo -e "${BLUE}[1/2] Starting Node.js Backend...${NC}"
cd cab-backend-node || { echo -e "${RED}Failed to enter cab-backend-node directory${NC}"; exit 1; }

# Check and auto-start MongoDB if needed
if ! nc -z -w 2 127.0.0.1 27017 &>/dev/null; then
    echo -e "${YELLOW}MongoDB is not running. Attempting to start it via Homebrew...${NC}"
    if command -v brew &>/dev/null; then
        brew services start mongodb-community
        # Wait up to 5 seconds for MongoDB to start
        echo -n "Waiting for MongoDB to boot up"
        for i in {1..5}; do
            if nc -z -w 1 127.0.0.1 27017 &>/dev/null; then
                echo -e "\n${GREEN}MongoDB started successfully!${NC}"
                break
            fi
            echo -n "."
            sleep 1
        done
        echo ""
    fi
    
    # Final check
    if ! nc -z -w 1 127.0.0.1 27017 &>/dev/null; then
        echo -e "${RED}Warning: Port 27017 (MongoDB) is still unreachable. Please ensure MongoDB is running manually.${NC}"
    fi
fi

npm run dev &
BACKEND_PID=$!
cd ..

# Start Frontend
echo -e "${BLUE}[2/2] Starting React/Vite Frontend...${NC}"
cd cab-frontend || { echo -e "${RED}Failed to enter cab-frontend directory${NC}"; kill "$BACKEND_PID" 2>/dev/null; exit 1; }
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}Backend started (PID: $BACKEND_PID) -> http://localhost:8000${NC}"
echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID) -> http://localhost:5173${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers at once.${NC}"
echo -e "${BLUE}=================================================${NC}"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
