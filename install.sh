#!/usr/bin/env bash

# =============================================================================
# SVAZ.APP INTERACTIVE INSTALLATION SCRIPT
# =============================================================================
# One-command installation for svaz.app - Self-hosted video calling platform
# 
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
#   wget -qO- https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash
#
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

# =============================================================================
# HELPER FUNCTIONS
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
        read -p "$(echo -e ${CYAN}${prompt}${NC})" yn
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
        read -p "$(echo -e ${CYAN}${prompt} [${default}]: ${NC})" value
        value=${value:-$default}
    else
        read -p "$(echo -e ${CYAN}${prompt}: ${NC})" value
    fi
    
    eval $var_name="'$value'"
}

# Validate domain name
validate_domain() {
    local domain="$1"
    if [[ ! "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# Validate email
validate_email() {
    local email="$1"
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# Generate random secret
generate_secret() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    elif [ "$(uname)" = "Darwin" ]; then
        OS="macos"
    else
        OS="unknown"
    fi
    
    print_info "Detected OS: $OS $OS_VERSION"
}

# Check system requirements
check_requirements() {
    print_step "Checking system requirements..."
    
    # Check RAM
    local total_ram=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 2000 ]; then
        print_warning "Low RAM detected: ${total_ram}MB (minimum 2GB recommended)"
        if ! ask_yes_no "Continue anyway?"; then
            exit 1
        fi
    else
        print_success "RAM: ${total_ram}MB"
    fi
    
    # Check disk space
    local free_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$free_space" -lt 20 ]; then
        print_warning "Low disk space: ${free_space}GB (minimum 20GB recommended)"
        if ! ask_yes_no "Continue anyway?"; then
            exit 1
        fi
    else
        print_success "Disk space: ${free_space}GB available"
    fi
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    print_success "CPU cores: $cpu_cores"
}

# =============================================================================
# INTERACTIVE MENUS
# =============================================================================

# Menu: Select deployment scenario
select_deployment_scenario() {
    print_header "STEP 1: Choose Deployment Scenario"
    
    echo -e "${BOLD}Choose your deployment scenario:${NC}"
    echo ""
    echo -e "${GREEN}1)${NC} 🟢 ${BOLD}Standalone VPS${NC} (All-in-One with Caddy)"
    echo "   ${CYAN}├─${NC} Automatic SSL certificates (Let's Encrypt)"
    echo "   ${CYAN}├─${NC} Easiest setup for beginners"
    echo "   ${CYAN}└─${NC} Recommended for first-time deployment"
    echo ""
    echo -e "${BLUE}2)${NC} 🔵 ${BOLD}VPS Behind External Reverse Proxy${NC}"
    echo "   ${CYAN}├─${NC} Use existing Nginx Proxy Manager, Traefik, etc."
    echo "   ${CYAN}├─${NC} No Caddy, no automatic SSL"
    echo "   ${CYAN}└─${NC} For advanced users with existing infrastructure"
    echo ""
    
    while true; do
        read -p "$(echo -e ${CYAN}Enter your choice [1-2]: ${NC})" choice
        case $choice in
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
                print_error "Invalid choice. Please enter 1 or 2."
                ;;
        esac
    done
    
    echo ""
}

# Menu: Select installation mode
select_installation_mode() {
    print_header "STEP 2: Choose Installation Mode"
    
    echo -e "${BOLD}Choose installation mode:${NC}"
    echo ""
    echo -e "${GREEN}1)${NC} 🚀 ${BOLD}Quick Install${NC} (Recommended)"
    echo "   ${CYAN}├─${NC} Minimal interactive prompts"
    echo "   ${CYAN}├─${NC} Auto-generate all secrets and keys"
    echo "   ${CYAN}├─${NC} Auto-detect system settings"
    echo "   ${CYAN}└─${NC} Best for most users"
    echo ""
    echo -e "${YELLOW}2)${NC} ⚙️  ${BOLD}Advanced Install${NC}"
    echo "   ${CYAN}├─${NC} Configure every setting manually"
    echo "   ${CYAN}├─${NC} Option to skip/auto-fill each step"
    echo "   ${CYAN}├─${NC} Full control over configuration"
    echo "   ${CYAN}└─${NC} For experienced users"
    echo ""
    
    while true; do
        read -p "$(echo -e ${CYAN}Enter your choice [1-2]: ${NC})" choice
        case $choice in
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
                print_error "Invalid choice. Please enter 1 or 2."
                ;;
        esac
    done
    
    echo ""
}

# =============================================================================
# DEPENDENCY INSTALLATION
# =============================================================================

# Install Docker
install_docker() {
    print_step "Installing Docker..."

    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        print_success "Docker already installed: $docker_version"
        return 0
    fi

    case "$OS" in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        centos|rhel|fedora)
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            ;;
        *)
            print_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    # Add current user to docker group
    sudo usermod -aG docker $USER

    print_success "Docker installed successfully"
}

# Install Git
install_git() {
    print_step "Installing Git..."

    if command -v git &> /dev/null; then
        print_success "Git already installed"
        return 0
    fi

    case "$OS" in
        ubuntu|debian)
            sudo apt-get install -y git
            ;;
        centos|rhel|fedora)
            sudo yum install -y git
            ;;
        *)
            print_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    print_success "Git installed successfully"
}

# Configure firewall
configure_firewall() {
    print_step "Configuring firewall..."

    if ! command -v ufw &> /dev/null; then
        print_warning "UFW not installed, skipping firewall configuration"
        return 0
    fi

    if ! ask_yes_no "Configure firewall (UFW) automatically?" "y"; then
        print_info "Skipping firewall configuration"
        return 0
    fi

    # Allow SSH first (important!)
    sudo ufw allow 22/tcp

    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        # Standalone mode: Caddy handles HTTP/HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw allow 443/udp
    else
        # External proxy mode: Expose frontend, API, LiveKit
        sudo ufw allow 3000/tcp
        sudo ufw allow 8080/tcp
        sudo ufw allow 7880/tcp
    fi

    # CoTURN ports (both scenarios)
    sudo ufw allow 3478/tcp
    sudo ufw allow 3478/udp
    sudo ufw allow 5349/tcp
    sudo ufw allow 5349/udp
    sudo ufw allow 49152:65535/udp

    # Enable firewall
    sudo ufw --force enable

    print_success "Firewall configured"
}

# =============================================================================
# CONFIGURATION GENERATION
# =============================================================================

# Collect user configuration (Quick mode)
collect_config_quick() {
    print_header "STEP 3: Configuration"

    # Domain
    while true; do
        read_input "Enter your domain name (e.g., svaz.app)" "" USER_DOMAIN
        if validate_domain "$USER_DOMAIN"; then
            break
        else
            print_error "Invalid domain format. Please try again."
        fi
    done

    # Email
    while true; do
        read_input "Enter your email for SSL certificates" "" USER_EMAIL
        if validate_email "$USER_EMAIL"; then
            break
        else
            print_error "Invalid email format. Please try again."
        fi
    done

    print_success "Configuration collected"
    echo ""
}

# Collect user configuration (Advanced mode)
collect_config_advanced() {
    print_header "STEP 3: Advanced Configuration"

    # Domain
    while true; do
        read_input "Enter your domain name" "svaz.app" USER_DOMAIN
        if validate_domain "$USER_DOMAIN"; then
            break
        else
            print_error "Invalid domain format. Please try again."
        fi
    done

    # Email
    while true; do
        read_input "Enter your email for SSL certificates" "admin@${USER_DOMAIN}" USER_EMAIL
        if validate_email "$USER_EMAIL"; then
            break
        else
            print_error "Invalid email format. Please try again."
        fi
    done

    # Installation directory
    read_input "Installation directory" "$DEFAULT_INSTALL_DIR" INSTALL_DIR

    print_success "Configuration collected"
    echo ""
}

# Generate .env file
generate_env_file() {
    print_step "Generating environment configuration..."

    local env_template
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        env_template=".env.example"
    else
        env_template=".env.external-proxy.example"
    fi

    if [ ! -f "$env_template" ]; then
        print_error "Template file $env_template not found"
        exit 1
    fi

    # Copy template
    cp "$env_template" .env

    # Generate secrets
    local jwt_secret=$(generate_secret 48)
    local coturn_password=$(generate_secret 32)
    local session_secret=$(generate_secret 32)
    local livekit_api_key=$(openssl rand -hex 16)
    local livekit_api_secret=$(generate_secret 32)
    local postgres_password=$(generate_secret 32)

    # Replace values in .env
    sed -i "s|DOMAIN=.*|DOMAIN=$USER_DOMAIN|" .env
    sed -i "s|SSL_EMAIL=.*|SSL_EMAIL=$USER_EMAIL|" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" .env
    sed -i "s|COTURN_PASSWORD=.*|COTURN_PASSWORD=$coturn_password|" .env
    sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$session_secret|" .env
    sed -i "s|LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=$livekit_api_key|" .env
    sed -i "s|LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$livekit_api_secret|" .env
    sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$postgres_password|" .env
    sed -i "s|DATABASE_URL=postgresql://svazapp:.*@db:5432/svazapp|DATABASE_URL=postgresql://svazapp:$postgres_password@db:5432/svazapp|" .env
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$USER_DOMAIN|" .env

    # Update URLs
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$USER_DOMAIN/api|" .env
        sed -i "s|NEXT_PUBLIC_SOCKET_URL=.*|NEXT_PUBLIC_SOCKET_URL=https://$USER_DOMAIN|" .env
        sed -i "s|LIVEKIT_PUBLIC_URL=.*|LIVEKIT_PUBLIC_URL=wss://$USER_DOMAIN/livekit|" .env
    else
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$USER_DOMAIN/api|" .env
        sed -i "s|NEXT_PUBLIC_SOCKET_URL=.*|NEXT_PUBLIC_SOCKET_URL=https://$USER_DOMAIN|" .env
        sed -i "s|LIVEKIT_PUBLIC_URL=.*|LIVEKIT_PUBLIC_URL=wss://$USER_DOMAIN/livekit|" .env
    fi

    print_success "Environment file generated"
}

# =============================================================================
# INSTALLATION
# =============================================================================

# Clone repository
clone_repository() {
    print_step "Cloning repository..."

    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Directory $INSTALL_DIR already exists"
        if ask_yes_no "Remove existing directory and continue?" "n"; then
            sudo rm -rf "$INSTALL_DIR"
        else
            print_error "Installation cancelled"
            exit 1
        fi
    fi

    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $USER:$USER "$INSTALL_DIR"

    git clone https://github.com/geladons/svazapp.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    print_success "Repository cloned"
}

# Deploy services
deploy_services() {
    print_step "Deploying services..."

    local compose_file
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        compose_file="docker-compose.yml"
    else
        compose_file="docker-compose.external-proxy.yml"
    fi

    print_info "Using compose file: $compose_file"

    # Pull images
    docker compose -f "$compose_file" pull

    # Build services
    docker compose -f "$compose_file" build

    # Start services
    docker compose -f "$compose_file" up -d

    print_success "Services deployed"
}

# Verify installation
verify_installation() {
    print_step "Verifying installation..."

    local compose_file
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        compose_file="docker-compose.yml"
    else
        compose_file="docker-compose.external-proxy.yml"
    fi

    # Wait for services to start
    sleep 10

    # Check if all containers are running
    local running_containers=$(docker compose -f "$compose_file" ps --services --filter "status=running" | wc -l)
    local total_containers=$(docker compose -f "$compose_file" ps --services | wc -l)

    if [ "$running_containers" -eq "$total_containers" ]; then
        print_success "All services are running ($running_containers/$total_containers)"
    else
        print_warning "Some services may not be running ($running_containers/$total_containers)"
        print_info "Check logs with: docker compose -f $compose_file logs"
    fi
}

# Print post-installation instructions
print_post_install() {
    print_header "Installation Complete!"

    echo -e "${GREEN}✓${NC} ${BOLD}svaz.app has been successfully installed!${NC}"
    echo ""

    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        echo -e "${BOLD}Next Steps:${NC}"
        echo ""
        echo -e "1. ${CYAN}Wait for SSL certificate${NC} (may take 1-2 minutes)"
        echo "   Caddy will automatically obtain a Let's Encrypt certificate"
        echo ""
        echo -e "2. ${CYAN}Access your application:${NC}"
        echo "   https://$USER_DOMAIN"
        echo ""
        echo -e "3. ${CYAN}Check service status:${NC}"
        echo "   cd $INSTALL_DIR"
        echo "   docker compose ps"
        echo ""
        echo -e "4. ${CYAN}View logs:${NC}"
        echo "   docker compose logs -f"
        echo ""
    else
        echo -e "${BOLD}Next Steps:${NC}"
        echo ""
        echo -e "1. ${CYAN}Configure your reverse proxy (NPM/Traefik):${NC}"
        echo "   - Create ONE proxy host for: $USER_DOMAIN"
        echo "   - Forward / to: your-vps-ip:3000 (Frontend)"
        echo "   - Add custom location /api to: your-vps-ip:8080"
        echo "   - Add custom location /livekit to: your-vps-ip:7880"
        echo "   - Enable WebSocket support on all locations"
        echo ""
        echo -e "2. ${CYAN}Configure router port forwarding:${NC}"
        echo "   - Forward ports 3478, 5349, 49152-65535 to your VPS"
        echo "   - These ports are for CoTURN (cannot be proxied)"
        echo ""
        echo -e "3. ${CYAN}Access your application:${NC}"
        echo "   https://$USER_DOMAIN"
        echo ""
        echo -e "4. ${CYAN}Check service status:${NC}"
        echo "   cd $INSTALL_DIR"
        echo "   docker compose -f docker-compose.external-proxy.yml ps"
        echo ""
    fi

    echo -e "${BOLD}Useful Commands:${NC}"
    echo ""
    echo "  View logs:        docker compose logs -f"
    echo "  Restart services: docker compose restart"
    echo "  Stop services:    docker compose down"
    echo "  Update:           git pull && docker compose up -d --build"
    echo ""

    echo -e "${BOLD}Documentation:${NC}"
    echo "  📖 Full guide: https://github.com/geladons/svazapp/blob/main/DEPLOYMENT.md"
    echo "  🔧 Ports:      https://github.com/geladons/svazapp/blob/main/PORTS.md"
    echo "  ⚙️  ENV vars:   https://github.com/geladons/svazapp/blob/main/ENV_VARIABLES.md"
    echo ""

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  🎉 Enjoy your svaz.app installation!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    # Print banner
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

# Run main function
main "$@"


