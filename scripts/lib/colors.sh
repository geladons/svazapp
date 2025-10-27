#!/usr/bin/env bash

# =============================================================================
# COLOR AND OUTPUT FUNCTIONS
# =============================================================================

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1" | tee -a "${LOG_FILE}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "${LOG_FILE}"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "${LOG_FILE}"
}

print_error() {
    echo -e "${RED}✗${NC} $1" | tee -a "${LOG_FILE}"
}

print_step() {
    echo -e "${CYAN}▶${NC} ${BOLD}$1${NC}" | tee -a "${LOG_FILE}"
}

# Print section header
print_header() {
    echo "" | tee -a "${LOG_FILE}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════════${NC}" | tee -a "${LOG_FILE}"
    echo -e "${BOLD}  $1${NC}" | tee -a "${LOG_FILE}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════════${NC}" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
}

# Print welcome banner
print_banner() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
    ███████╗██╗   ██╗ █████╗ ███████╗     █████╗ ██████╗ ██████╗ 
    ██╔════╝██║   ██║██╔══██╗╚══███╔╝    ██╔══██╗██╔══██╗██╔══██╗
    ███████╗██║   ██║███████║  ███╔╝     ███████║██████╔╝██████╔╝
    ╚════██║╚██╗ ██╔╝██╔══██║ ███╔╝      ██╔══██║██╔═══╝ ██╔═══╝ 
    ███████║ ╚████╔╝ ██║  ██║███████╗    ██║  ██║██║     ██║     
    ╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝     ╚═╝     
EOF
    echo -e "${NC}"
    echo -e "${BOLD}    Autonomous Video Communication Platform - Installer v${VERSION}${NC}"
    echo ""
}

# Ask yes/no question
ask_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    
    if [ "${default}" = "y" ]; then
        prompt="${prompt} [Y/n]: "
    else
        prompt="${prompt} [y/N]: "
    fi
    
    while true; do
        read -p "$(echo -e ${CYAN}${prompt}${NC})" yn </dev/tty
        yn=${yn:-$default}
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Read user input with default value
read_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$(echo -e ${CYAN}${prompt} [${default}]: ${NC})" value </dev/tty
        value=${value:-$default}
    else
        read -p "$(echo -e ${CYAN}${prompt}: ${NC})" value </dev/tty
    fi
    
    eval $var_name="'$value'"
}

