#!/usr/bin/env bash
# ==============================================================================
# SafeCheck - Full System Orchestration Script
#
# Launches all SafeCheck services simultaneously in the correct dependency order:
#   1. Plant Modbus TCP Server (127.0.0.1:5020)
#   2. Backend FastAPI API & Poller (http://127.0.0.1:8000)
#   3. Frontend Vite Dashboard (http://localhost:5173)
#   4. Legitimate SCADA Operator Client (Source port 6001 -> 5020)
#
# Usage:
#   ./start.sh             # Start all services
#   ./start.sh -k          # Kill any existing processes on ports first, then start
#   ./start.sh --help      # Show help
# ==============================================================================

set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# Color Codes
GREEN='\033[1;32m'
BLUE='\033[1;34m'
MAGENTA='\033[1;35m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Track background process PIDs
PIDS=()
P_PLANT=""
P_BACKEND=""
P_FRONTEND=""
P_CLIENT=""

# Ports used by the system
PORT_PLANT=5020
PORT_BACKEND=8000
PORT_FRONTEND=5173

# Display Banner
print_header() {
    echo -e "${BOLD}${BLUE}========================================================================${NC}"
    echo -e "${BOLD}${BLUE}                SafeCheck System Orchestrator                           ${NC}"
    echo -e "${BOLD}${BLUE}========================================================================${NC}"
}

# Cleanup handler on exit or Ctrl+C
cleanup() {
    echo ""
    echo -e "${BOLD}${YELLOW}========================================================================${NC}"
    echo -e "${BOLD}${YELLOW} Shutting down all SafeCheck services gracefully...                     ${NC}"
    echo -e "${BOLD}${YELLOW}========================================================================${NC}"

    for pid in "${PIDS[@]}"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done

    # Give processes up to 2 seconds to terminate
    sleep 1.5

    for pid in "${PIDS[@]}"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    done

    echo -e "${GREEN}All services stopped successfully.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Function to kill existing processes bound to project ports
kill_existing() {
    echo -e "${YELLOW}Killing existing processes on ports $PORT_PLANT, $PORT_BACKEND, $PORT_FRONTEND...${NC}"
    fuser -k "${PORT_PLANT}/tcp" 2>/dev/null || true
    fuser -k "${PORT_BACKEND}/tcp" 2>/dev/null || true
    fuser -k "${PORT_FRONTEND}/tcp" 2>/dev/null || true
    pkill -f "legitimate_client/run.py" 2>/dev/null || true
    sleep 1
}

# Helper to check if a port is in use
is_port_in_use() {
    local port="$1"
    python3 -c "import socket; s = socket.socket(); s.settimeout(0.5); res = s.connect_ex(('127.0.0.1', $port)); s.close(); exit(0 if res == 0 else 1)" 2>/dev/null
}

# Helper to wait for a port to be ready
wait_for_port() {
    local host="$1"
    local port="$2"
    local name="$3"
    local max_wait="${4:-20}"
    local count=0

    echo -ne "  -> Waiting for ${BOLD}$name${NC} ($host:$port) to be ready..."
    while ! python3 -c "import socket; s = socket.socket(); s.settimeout(0.8); res = s.connect_ex(('$host', $port)); s.close(); exit(0 if res == 0 else 1)" 2>/dev/null; do
        sleep 0.5
        count=$((count + 1))
        if [ "$count" -ge "$((max_wait * 2))" ]; then
            echo -e " ${RED}FAILED (timeout after ${max_wait}s)!${NC}"
            echo -e "${RED}Check logs in $LOG_DIR/ for details.${NC}"
            return 1
        fi
        echo -ne "."
    done
    echo -e " ${GREEN}READY!${NC}"
    return 0
}

# Parse command line flags
KILL_EXISTING=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        -k|--kill|--kill-existing)
            KILL_EXISTING=true
            shift
            ;;
        -h|--help)
            print_header
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -k, --kill, --kill-existing    Stop existing instances running on ports 5020, 8000, 5173"
            echo "  -h, --help                     Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Run ./start.sh --help for usage."
            exit 1
            ;;
    esac
done

print_header

if [ "$KILL_EXISTING" = true ]; then
    kill_existing
else
    # Check if any ports are in use
    OCCUPIED=()
    is_port_in_use $PORT_PLANT && OCCUPIED+=("Port $PORT_PLANT (Plant)")
    is_port_in_use $PORT_BACKEND && OCCUPIED+=("Port $PORT_BACKEND (Backend)")
    is_port_in_use $PORT_FRONTEND && OCCUPIED+=("Port $PORT_FRONTEND (Frontend)")

    if [ ${#OCCUPIED[@]} -gt 0 ]; then
        echo -e "${YELLOW}Warning: The following ports are already occupied:${NC}"
        for item in "${OCCUPIED[@]}"; do
            echo -e "  - $item"
        done
        echo ""
        echo -e "Re-run with ${BOLD}./start.sh -k${NC} to automatically kill existing processes, or free them manually."
        echo ""
        read -p "Kill existing instances now and proceed? [Y/n] " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            kill_existing
        else
            echo "Aborted."
            exit 1
        fi
    fi
fi

echo -e "\n${BOLD}[1/4] Starting Plant Server (Modbus TCP)...${NC}"
cd "$ROOT_DIR/plant"
uv run run.py 2>&1 | tee "$LOG_DIR/plant.log" | sed -u "s/^/$(printf "${GREEN}[PLANT]${NC} ")/" &
P_PLANT=$!
PIDS+=("$P_PLANT")
wait_for_port "127.0.0.1" "$PORT_PLANT" "Plant Server" 15

echo -e "\n${BOLD}[2/4] Starting Backend Server (FastAPI & Poller)...${NC}"
cd "$ROOT_DIR/backend"
uv run uvicorn app.main:app --host 0.0.0.0 --port "$PORT_BACKEND" --reload 2>&1 | tee "$LOG_DIR/backend.log" | sed -u "s/^/$(printf "${BLUE}[BACKEND]${NC} ")/" &
P_BACKEND=$!
PIDS+=("$P_BACKEND")
wait_for_port "127.0.0.1" "$PORT_BACKEND" "Backend API" 20

echo -e "\n${BOLD}[3/4] Starting Frontend Dashboard (Vite)...${NC}"
cd "$ROOT_DIR/dashboard"
npm run dev 2>&1 | tee "$LOG_DIR/frontend.log" | sed -u "s/^/$(printf "${MAGENTA}[FRONTEND]${NC} ")/" &
P_FRONTEND=$!
PIDS+=("$P_FRONTEND")
wait_for_port "127.0.0.1" "$PORT_FRONTEND" "Frontend UI" 20

echo -e "\n${BOLD}[4/4] Starting Legitimate SCADA Operator Client...${NC}"
cd "$ROOT_DIR/legitimate_client"
uv run run.py 2>&1 | tee "$LOG_DIR/legit_client.log" | sed -u "s/^/$(printf "${CYAN}[CLIENT]${NC} ")/" &
P_CLIENT=$!
PIDS+=("$P_CLIENT")
sleep 1.5

echo -e "\n${BOLD}${GREEN}========================================================================${NC}"
echo -e "${BOLD}${GREEN}            All SafeCheck Services Started Successfully!                ${NC}"
echo -e "${BOLD}${GREEN}========================================================================${NC}"
echo -e "  ${BOLD}Plant Modbus Server:${NC}     127.0.0.1:$PORT_PLANT"
echo -e "  ${BOLD}Backend API Docs:${NC}        http://127.0.0.1:$PORT_BACKEND/docs"
echo -e "  ${BOLD}Frontend Dashboard:${NC}      http://localhost:$PORT_FRONTEND"
echo -e "  ${BOLD}Operator Control Panel:${NC}  http://localhost:$PORT_FRONTEND/operator"
echo -e "  ${BOLD}Legitimate Client:${NC}       Active (Cycle running)"
echo -e "  ${BOLD}Logs Directory:${NC}          $LOG_DIR/"
echo -e "${BOLD}${BLUE}========================================================================${NC}"
echo -e "Streaming live output below. Press ${BOLD}${RED}Ctrl+C${NC} to stop all services."
echo -e "${BOLD}${BLUE}========================================================================${NC}\n"

# Wait indefinitely for background jobs or Ctrl+C
wait
