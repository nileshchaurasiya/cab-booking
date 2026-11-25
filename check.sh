#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_line() {
    printf "%b\n" "$1"
}

print_line "\n${BLUE}=======================================================${NC}"
print_line "${BOLD}${CYAN}        INDIAN CABS — FULL SYSTEM HEALTH CHECK         ${NC}"
print_line "${BLUE}=======================================================${NC}\n"

# 1. FRONTEND CHECK
print_line "${BOLD}${YELLOW}[1/2] Checking Frontend (React + TypeScript + Vite)...${NC}"
if npm --prefix cab-frontend run build > /dev/null 2>&1; then
    print_line "${GREEN}✓ Frontend Build & TypeScript: PASSED (0 errors)${NC}"
else
    print_line "${RED}✗ Frontend Build Failed! Run 'cd cab-frontend && npm run build' to inspect errors.${NC}"
    exit 1
fi

print_line ""

# 2. BACKEND CHECK
print_line "${BOLD}${YELLOW}[2/2] Checking Backend (Node.js + MongoDB APIs)...${NC}"
cd cab-backend-node || exit 1
if node test_backend_controller.js > /dev/null 2>&1; then
    print_line "${GREEN}✓ Backend Schema & Logic Tests: PASSED (All OK)${NC}"
else
    print_line "${RED}✗ Backend Tests Failed!${NC}"
    cd ..
    exit 1
fi
cd ..

print_line "\n${GREEN}=======================================================${NC}"
print_line "${BOLD}${GREEN}  🎉 ALL CHECKS PASSED — FULL PROJECT IS HEALTHY & OK!  ${NC}"
print_line "${GREEN}=======================================================${NC}\n"
