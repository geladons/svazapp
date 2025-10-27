#!/usr/bin/env bash

# =============================================================================
# SVAZ.APP FULL INTERACTIVE INSTALLER
# =============================================================================
# This is the main installer script with interactive menus
# Called by install.sh bootstrapper
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# =============================================================================
# CONFIGURATION
# =============================================================================

VERSION="2.0.0"
DEFAULT_INSTALL_DIR="/opt/svazapp"
INSTALL_DIR="${DEFAULT_INSTALL_DIR}"
LOG_FILE="install.log"

# User selections
DEPLOYMENT_SCENARIO=""  # "standalone" or "external-proxy"
INSTALLATION_MODE=""    # "quick" or "advanced"

# User-provided values
USER_DOMAIN=""
USER_EMAIL=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# =============================================================================
# LOAD MODULES
# =============================================================================

# Source helper modules
source "$SCRIPT_DIR/lib/colors.sh"
source "$SCRIPT_DIR/lib/validators.sh"
source "$SCRIPT_DIR/lib/system.sh"
source "$SCRIPT_DIR/lib/docker.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/ssl.sh"
source "$SCRIPT_DIR/lib/deploy.sh"

# =============================================================================
# INTERACTIVE MENUS
# =============================================================================

# Menu: Select deployment scenario
select_deployment_scenario() {
    print_header "STEP 1: Choose Deployment Scenario"
    
    echo -e "${BOLD}Choose your deployment scenario:${NC}"
    echo ""
    
    PS3=$'\n'"$(echo -e ${CYAN}Use arrow keys and Enter to select: ${NC})"
    
    options=(
        "🟢 Standalone VPS (All-in-One with Caddy)"
        "🔵 VPS Behind External Reverse Proxy"
    )
    
    select opt in "${options[@]}"; do
        case $REPLY in
            1)
                DEPLOYMENT_SCENARIO="standalone"
                print_success "Selected: Standalone VPS (with Caddy)"
                break
                ;;
            2)
                DEPLOYMENT_SCENARIO="external-proxy"
                print_success "Selected: VPS Behind External Reverse Proxy"
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1 or 2."
                ;;
        esac
    done </dev/tty
    
    echo ""
}

# Menu: Select installation mode
select_installation_mode() {
    print_header "STEP 2: Choose Installation Mode"
    
    echo -e "${BOLD}Choose installation mode:${NC}"
    echo ""
    
    PS3=$'\n'"$(echo -e ${CYAN}Use arrow keys and Enter to select: ${NC})"
    
    options=(
        "🚀 Quick Install (Recommended)"
        "⚙️  Advanced Install"
    )
    
    select opt in "${options[@]}"; do
        case $REPLY in
            1)
                INSTALLATION_MODE="quick"
                print_success "Selected: Quick Install"
                break
                ;;
            2)
                INSTALLATION_MODE="advanced"
                print_success "Selected: Advanced Install"
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1 or 2."
                ;;
        esac
    done </dev/tty
    
    echo ""
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    print_banner
    
    # Detect OS
    detect_os
    
    # Check requirements
    check_requirements
    
    echo ""
    
    # Interactive menus
    select_deployment_scenario
    select_installation_mode
    
    # Collect configuration
    if [ "$INSTALLATION_MODE" = "quick" ]; then
        collect_config_quick
    else
        collect_config_advanced
    fi
    
    # Confirm installation
    print_header "Ready to Install"
    echo -e "${BOLD}Installation Summary:${NC}"
    echo ""
    echo "  Deployment Scenario: ${CYAN}$DEPLOYMENT_SCENARIO${NC}"
    echo "  Installation Mode:   ${CYAN}$INSTALLATION_MODE${NC}"
    echo "  Domain:              ${CYAN}$USER_DOMAIN${NC}"
    echo "  Email:               ${CYAN}$USER_EMAIL${NC}"
    echo "  Install Directory:   ${CYAN}$INSTALL_DIR${NC}"
    echo ""
    
    if ! ask_yes_no "Proceed with installation?" "y"; then
        print_error "Installation cancelled by user"
        exit 0
    fi
    
    # Start installation
    print_header "Installing Dependencies"
    
    install_docker
    install_git
    
    print_header "Cloning Repository"
    clone_repository
    
    print_header "Generating Configuration"
    generate_env_file

    # Setup CoTURN SSL (only for external-proxy scenario)
    if [ "$DEPLOYMENT_SCENARIO" = "external-proxy" ]; then
        setup_coturn_ssl
    fi

    print_header "Configuring Firewall"
    configure_firewall
    
    print_header "Deploying Services"
    deploy_services
    
    print_header "Verifying Installation"
    verify_installation
    
    # Print post-installation instructions
    print_post_install
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"

