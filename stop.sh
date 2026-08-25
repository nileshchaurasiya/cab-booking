#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}=======================================================${NC}"
echo -e "${BOLD}${YELLOW}          STOPPING CAB BOOKING WEB SERVERS             ${NC}"
echo -e "${BLUE}=======================================================${NC}\n"

# Find and kill backend on port 8000
PIDS_8000=$(lsof -t -iTCP:8000 -sTCP:LISTEN 2>/dev/null)
if [ -n "$PIDS_8000" ]; then
    echo -e "Stopping Backend server on port 8000 (PID: $PIDS_8000)..."
    kill -9 $PIDS_8000 2>/dev/null
    echo -e "${GREEN}✓ Port 8000 Backend stopped.${NC}"
else
    echo -e "No backend server was running on port 8000."
fi

# Find and kill frontend on port 5173 / 5174
PIDS_5173=$(lsof -t -iTCP:5173,5174 -sTCP:LISTEN 2>/dev/null)
if [ -n "$PIDS_5173" ]; then
    echo -e "Stopping Frontend server on port 5173 (PID: $PIDS_5173)..."
    kill -9 $PIDS_5173 2>/dev/null
    echo -e "${GREEN}✓ Port 5173 Frontend stopped.${NC}"
else
    echo -e "No frontend server was running on port 5173."
fi

echo -e "\n${GREEN}${BOLD}All web servers stopped successfully.${NC}\n"
