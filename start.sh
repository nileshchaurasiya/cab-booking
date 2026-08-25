#!/bin/bash

# Colors for output formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Determine which backend to start ('node' by default, or 'php' / 'mysql' if passed as argument)
BACKEND_CHOICE="${1:-node}"
BACKEND_CHOICE=$(echo "$BACKEND_CHOICE" | tr '[:upper:]' '[:lower:]')

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BOLD}${GREEN}      Starting Cab Booking System Servers        ${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Clean up any lingering processes on ports 8000 and 5173 before start
OLD_8000=$(lsof -t -iTCP:8000 -sTCP:LISTEN 2>/dev/null)
if [ -n "$OLD_8000" ]; then
    kill -9 $OLD_8000 2>/dev/null
fi
OLD_5173=$(lsof -t -iTCP:5173 -sTCP:LISTEN 2>/dev/null)
if [ -n "$OLD_5173" ]; then
    kill -9 $OLD_5173 2>/dev/null
fi

# Exit handler to kill background servers on Ctrl+C
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

trap cleanup SIGINT SIGTERM

# 1. START BACKEND SERVER
if [ "$BACKEND_CHOICE" = "php" ] || [ "$BACKEND_CHOICE" = "laravel" ] || [ "$BACKEND_CHOICE" = "mysql" ]; then
    echo -e "${BLUE}[1/2] Starting PHP Laravel Backend (MySQL)...${NC}"
    
    # Check MySQL daemon
    if ! nc -z -w 1 127.0.0.1 3306 2>/dev/null; then
        echo -e "${YELLOW}MySQL is not running. Attempting to start via Homebrew...${NC}"
        brew services start mysql 2>/dev/null
        sleep 2
    fi

    cd cab-backend-php || { echo -e "${RED}Failed to enter cab-backend-php directory${NC}"; exit 1; }
    php artisan serve --port=8000 &
    BACKEND_PID=$!
    cd ..
    BACKEND_NAME="Laravel PHP (MySQL on Port 3306)"
else
    echo -e "${BLUE}[1/2] Starting Node.js Backend (MongoDB)...${NC}"
    
    # Check MongoDB daemon
    if ! nc -z -w 1 127.0.0.1 27017 2>/dev/null; then
        echo -e "${YELLOW}MongoDB is not running. Attempting to start via Homebrew...${NC}"
        brew services start mongodb-community 2>/dev/null
        sleep 2
    fi

    cd cab-backend-node || { echo -e "${RED}Failed to enter cab-backend-node directory${NC}"; exit 1; }
    npm run dev &
    BACKEND_PID=$!
    cd ..
    BACKEND_NAME="Node.js Express (MongoDB on Port 27017)"
fi

# 2. START FRONTEND SERVER
echo -e "${BLUE}[2/2] Starting React Vite Frontend...${NC}"
cd cab-frontend || { echo -e "${RED}Failed to enter cab-frontend directory${NC}"; kill "$BACKEND_PID" 2>/dev/null; exit 1; }
npm run dev &
FRONTEND_PID=$!
cd ..

sleep 1

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${BOLD}${CYAN}SERVER LOGS & ACTIVE STATUS:${NC}"
echo -e "  - ${BOLD}Backend:${NC}  ${GREEN}● $BACKEND_NAME${NC}"
echo -e "              URL: ${CYAN}http://localhost:8000/api${NC}"
echo -e "  - ${BOLD}Frontend:${NC} ${GREEN}● React Vite${NC}"
echo -e "              URL: ${CYAN}http://localhost:5173${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "${YELLOW}Tip: Run ${BOLD}./status.sh${NC}${YELLOW} in another terminal to check status anytime.${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers.${NC}\n"

wait $BACKEND_PID $FRONTEND_PID
