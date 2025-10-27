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
            # Try to update package lists with retry
            local max_attempts=3
            local attempt=1

            while [ $attempt -le $max_attempts ]; do
                if [ $attempt -gt 1 ]; then
                    echo -e "${YELLOW}⚠${NC} Retry attempt $attempt/$max_attempts (waiting 10s)..."
                    sleep 10
                fi

                if sudo apt-get update 2>&1 | grep -q "Mirror sync in progress\|Hash Sum mismatch\|File has unexpected size"; then
                    echo -e "${YELLOW}⚠${NC} Ubuntu mirrors are syncing (temporary issue)"
                    attempt=$((attempt + 1))
                    continue
                fi

                # Update succeeded or failed with different error
                break
            done

            # Install Git
            sudo apt-get install -y git || {
                print_error "Failed to install Git"
                print_info "Please install Git manually: sudo apt-get install git"
                exit 1
            }
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

# Handle errors
handle_bootstrap_error() {
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo ""
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}${BOLD}  ❌ BOOTSTRAP FAILED${NC}"
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${BOLD}Failed to download installer from GitHub.${NC}"
        echo ""
        echo -e "${BOLD}Possible causes:${NC}"
        echo -e "  ${YELLOW}•${NC} No internet connection"
        echo -e "  ${YELLOW}•${NC} GitHub is not accessible"
        echo -e "  ${YELLOW}•${NC} Git is not installed"
        echo ""
        echo -e "${BOLD}Suggested fixes:${NC}"
        echo -e "  ${GREEN}•${NC} Check internet: ${CYAN}ping -c 3 google.com${NC}"
        echo -e "  ${GREEN}•${NC} Check GitHub: ${CYAN}curl -I https://github.com${NC}"
        echo -e "  ${GREEN}•${NC} Install Git: ${CYAN}sudo apt-get install git${NC}"
        echo ""
        echo -e "${BOLD}Alternative: Manual installation${NC}"
        echo "  git clone https://github.com/geladons/svazapp.git"
        echo "  cd svazapp"
        echo "  sudo bash scripts/installer.sh"
        echo ""
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
    fi
}

trap cleanup EXIT
trap handle_bootstrap_error ERR

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
    if ! git clone --depth 1 --branch "$BRANCH" "$REPO_URL" . > /dev/null 2>&1; then
        print_error "Failed to clone repository from GitHub"
        print_info "Trying without depth limit..."
        git clone --branch "$BRANCH" "$REPO_URL" . || exit 1
    fi
    
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

