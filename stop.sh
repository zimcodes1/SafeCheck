#!/usr/bin/env bash
# ==============================================================================
# SafeCheck - Service Termination Script
#
# Terminates all running SafeCheck background processes and frees all ports.
# ==============================================================================

GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${YELLOW}Stopping all SafeCheck services...${NC}"

# Terminate processes on specific ports
fuser -k 5020/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
fuser -k 5174/tcp 2>/dev/null || true

# Terminate Python & Vite client processes
pkill -f "plant/run.py" 2>/dev/null || true
pkill -f "legitimate_client/run.py" 2>/dev/null || true
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

sleep 1
echo -e "${BOLD}${GREEN}All SafeCheck services have been terminated.${NC}"

