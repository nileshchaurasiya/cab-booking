#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}=======================================================${NC}"
echo -e "${BOLD}${CYAN}           CAB BOOKING SYSTEM - SERVER STATUS          ${NC}"
echo -e "${BLUE}=======================================================${NC}\n"

# 1. Check Port 8000 (Backend)
BACKEND_INFO=$(lsof -nP -iTCP:8000 -sTCP:LISTEN 2>/dev/null | tail -n +2)
if [ -n "$BACKEND_INFO" ]; then
    PID=$(echo "$BACKEND_INFO" | awk '{print $2}' | head -n 1)
    CMD=$(ps -p "$PID" -o command= 2>/dev/null)
    
    if echo "$CMD" | grep -qi "php"; then
        echo -e "${BOLD}Backend Server (Port 8000):${NC}  ${GREEN}● RUNNING (Laravel PHP / MySQL)${NC}"
        echo -e "  - Process PID:    ${CYAN}$PID${NC}"
        echo -e "  - Technology:     ${YELLOW}PHP Artisan / Laravel${NC}"
        echo -e "  - Database:       ${YELLOW}MySQL (Port 3306)${NC}"
        echo -e "  - Endpoint:       ${CYAN}http://localhost:8000/api${NC}"
    elif echo "$CMD" | grep -qi "node"; then
        echo -e "${BOLD}Backend Server (Port 8000):${NC}  ${GREEN}● RUNNING (Node.js / MongoDB)${NC}"
        echo -e "  - Process PID:    ${CYAN}$PID${NC}"
        echo -e "  - Technology:     ${YELLOW}Node.js Express${NC}"
        echo -e "  - Database:       ${YELLOW}MongoDB (Port 27017)${NC}"
        echo -e "  - Endpoint:       ${CYAN}http://localhost:8000/api${NC}"
    else
        echo -e "${BOLD}Backend Server (Port 8000):${NC}  ${GREEN}● RUNNING (PID: $PID)${NC}"
    fi
else
    echo -e "${BOLD}Backend Server (Port 8000):${NC}  ${RED}○ STOPPED${NC}"
fi

echo ""

# 2. Check Port 5173 (Frontend)
FRONTEND_INFO=$(lsof -nP -iTCP:5173 -sTCP:LISTEN 2>/dev/null | tail -n +2)
if [ -n "$FRONTEND_INFO" ]; then
    PID=$(echo "$FRONTEND_INFO" | awk '{print $2}' | head -n 1)
    echo -e "${BOLD}Frontend Server (Port 5173):${NC} ${GREEN}● RUNNING (React / Vite)${NC}"
    echo -e "  - Process PID:    ${CYAN}$PID${NC}"
    echo -e "  - URL:            ${CYAN}http://localhost:5173${NC}"
else
    echo -e "${BOLD}Frontend Server (Port 5173):${NC} ${RED}○ STOPPED${NC}"
fi

echo ""

# 3. Check Database Services
echo -e "${BOLD}Databases:${NC}"

# MySQL Check
if nc -z -w 1 127.0.0.1 3306 2>/dev/null; then
    echo -e "  - ${BOLD}MySQL (Port 3306):${NC}    ${GREEN}● ACTIVE${NC} (cab_booking)"
else
    echo -e "  - ${BOLD}MySQL (Port 3306):${NC}    ${RED}○ NOT RUNNING${NC}"
fi

# MongoDB Check
if nc -z -w 1 127.0.0.1 27017 2>/dev/null; then
    echo -e "  - ${BOLD}MongoDB (Port 27017):${NC} ${GREEN}● ACTIVE${NC} (cab_booking)"
else
    echo -e "  - ${BOLD}MongoDB (Port 27017):${NC} ${RED}○ NOT RUNNING${NC}"
fi

echo -e "\n${BLUE}=======================================================${NC}\n"
