#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper for portable colored output (works with both bash and sh)
print_line() {
    printf "%b\n" "$1"
}

print_line "\n${BLUE}=======================================================${NC}"
print_line "${BOLD}${CYAN}           CAB BOOKING SYSTEM - SERVER STATUS          ${NC}"
print_line "${BLUE}=======================================================${NC}\n"

# 1. Check Port 8000 (Backend)
BACKEND_INFO=$(lsof -nP -iTCP:8000 -sTCP:LISTEN 2>/dev/null | tail -n +2)
if [ -n "$BACKEND_INFO" ]; then
    PID=$(echo "$BACKEND_INFO" | awk '{print $2}' | head -n 1)
    print_line "${BOLD}Backend Server (Port 8000):${NC}  ${GREEN}● RUNNING (Node.js / MongoDB)${NC}"
    print_line "  - Process PID:    ${CYAN}$PID${NC}"
    print_line "  - Technology:     ${YELLOW}Node.js Express${NC}"
    print_line "  - Database:       ${YELLOW}MongoDB (Port 27017)${NC}"
    print_line "  - Endpoint:       ${CYAN}http://localhost:8000/api${NC}"
else
    print_line "${BOLD}Backend Server (Port 8000):${NC}  ${RED}○ STOPPED${NC}"
fi

print_line ""

# 2. Check Port 5173 (Frontend)
FRONTEND_INFO=$(lsof -nP -iTCP:5173 -sTCP:LISTEN 2>/dev/null | tail -n +2)
if [ -n "$FRONTEND_INFO" ]; then
    PID=$(echo "$FRONTEND_INFO" | awk '{print $2}' | head -n 1)
    print_line "${BOLD}Frontend Server (Port 5173):${NC} ${GREEN}● RUNNING (React / Vite)${NC}"
    print_line "  - Process PID:    ${CYAN}$PID${NC}"
    print_line "  - URL:            ${CYAN}http://localhost:5173${NC}"
else
    print_line "${BOLD}Frontend Server (Port 5173):${NC} ${RED}○ STOPPED${NC}"
fi

print_line ""

# 3. Check Database Service
print_line "${BOLD}Database:${NC}"

# MongoDB Check
if nc -z -w 1 127.0.0.1 27017 2>/dev/null; then
    print_line "  - ${BOLD}MongoDB (Port 27017):${NC} ${GREEN}● ACTIVE${NC} (cab_booking)"
else
    print_line "  - ${BOLD}MongoDB (Port 27017):${NC} ${RED}○ NOT RUNNING${NC}"
fi

print_line "\n${BLUE}=======================================================${NC}\n"
