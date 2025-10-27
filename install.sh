#!/usr/bin/env bash

# =============================================================================
# SVAZ.APP INSTALLATION BOOTSTRAPPER
# =============================================================================
# This script downloads and runs the full interactive installer
# 
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
#   wget -qO- https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
#
# =============================================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# =============================================================================
# CONFIGURATION
# =============================================================================

VERSION="2.0.0"
REPO_URL="https://github.com/geladons/svazapp.git"
INSTALLER_DIR="/tmp/svazapp-installer-$$"
BRANCH="${SVAZAPP_BRANCH:-main}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_step() {
    echo -e "${CYAN}▶${NC} ${BOLD}$1${NC}"
}

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
    echo -e "${BOLD}    Autonomous Video Communication Platform${NC}"
    echo -e "    ${CYAN}Installer v${VERSION}${NC}"
    echo ""
}

# Check if Git is installed
check_git() {
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        print_step "Installing Git..."
        
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y git
        elif command -v yum &> /dev/null; then
            sudo yum install -y git
        else
            print_error "Cannot install Git automatically. Please install it manually."
            exit 1
        fi
        
        print_success "Git installed"
    fi
}

# Cleanup on exit
cleanup() {
    if [ -d "$INSTALLER_DIR" ]; then
        rm -rf "$INSTALLER_DIR"
    fi
}

trap cleanup EXIT

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    print_banner
    
    print_step "Preparing installation..."
    
    # Check Git
    check_git
    
    # Create temporary directory
    mkdir -p "$INSTALLER_DIR"
    cd "$INSTALLER_DIR"
    
    # Clone repository
    print_step "Downloading installer..."
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" . > /dev/null 2>&1
    
    if [ ! -f "scripts/installer.sh" ]; then
        print_error "Installer script not found in repository"
        exit 1
    fi
    
    print_success "Installer downloaded"
    echo ""
    
    # Run the full installer
    chmod +x scripts/installer.sh
    exec bash scripts/installer.sh "$@"
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"

