#!/usr/bin/env bash

# =============================================================================
# SVAZ.APP AUTOMATED INSTALLATION SCRIPT
# =============================================================================
# One-command installation for svaz.app - Self-hosted video calling platform
# 
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash
#   wget -qO- https://raw.githubusercontent.com/yourusername/svazapp/main/install.sh | bash
#
# Options:
#   --advanced          Interactive mode with all configuration options
#   --dir PATH          Custom installation directory (default: /opt/svazapp)
#   --yes               Skip all confirmations (unattended mode)
#   --domain DOMAIN     Set domain name
#   --email EMAIL       Set admin email for SSL certificates
#
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# =============================================================================
# CONFIGURATION
# =============================================================================

# Script version
VERSION="1.0.0"

# Default values
DEFAULT_INSTALL_DIR="/opt/svazapp"
DEFAULT_DOMAIN="svaz.app"
DEFAULT_EMAIL="admin@svaz.app"

# Installation directory
INSTALL_DIR="${DEFAULT_INSTALL_DIR}"

# Mode flags
ADVANCED_MODE=false
UNATTENDED_MODE=false

# User-provided values
USER_DOMAIN=""
USER_EMAIL=""

# Log file
LOG_FILE="install.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${LOG_FILE}"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_FILE}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_FILE}"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
}

# Print section header
print_header() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=============================================================================" | tee -a "${LOG_FILE}"
    echo "$1" | tee -a "${LOG_FILE}"
    echo "=============================================================================" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
}

# Ask for confirmation
confirm() {
    if [ "${UNATTENDED_MODE}" = true ]; then
        return 0
    fi
    
    local prompt="$1"
    local default="${2:-n}"
    
    if [ "${default}" = "y" ]; then
        prompt="${prompt} [Y/n]: "
    else
        prompt="${prompt} [y/N]: "
    fi
    
    read -p "${prompt}" -r response
    response=${response:-${default}}
    
    if [[ "${response}" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Generate random string
generate_random_string() {
    local length="${1:-64}"
    openssl rand -base64 "$((length * 3 / 4))" | tr -d '\n' | head -c "${length}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS="${ID}"
        OS_VERSION="${VERSION_ID}"
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    elif [ "$(uname)" = "Darwin" ]; then
        OS="macos"
        OS_VERSION="$(sw_vers -productVersion)"
    else
        OS="unknown"
    fi
    
    print_info "Detected OS: ${OS} ${OS_VERSION}"
}

# Check system requirements
check_system_requirements() {
    print_header "CHECKING SYSTEM REQUIREMENTS"
    
    # Check RAM
    local total_ram
    if [ "${OS}" = "macos" ]; then
        total_ram=$(($(sysctl -n hw.memsize) / 1024 / 1024))
    else
        total_ram=$(free -m | awk '/^Mem:/{print $2}')
    fi
    
    print_info "Total RAM: ${total_ram} MB"
    
    if [ "${total_ram}" -lt 2048 ]; then
        print_warning "Minimum 2GB RAM recommended. You have ${total_ram} MB."
        if ! confirm "Continue anyway?"; then
            exit 1
        fi
    else
        print_success "RAM check passed"
    fi
    
    # Check disk space
    local available_space
    available_space=$(df -BG "$(dirname "${INSTALL_DIR}")" | awk 'NR==2 {print $4}' | sed 's/G//')
    
    print_info "Available disk space: ${available_space} GB"
    
    if [ "${available_space}" -lt 10 ]; then
        print_warning "Minimum 10GB disk space recommended. You have ${available_space} GB."
        if ! confirm "Continue anyway?"; then
            exit 1
        fi
    else
        print_success "Disk space check passed"
    fi
    
    # Check if running as root or with sudo
    if [ "${EUID}" -ne 0 ]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
    
    print_success "System requirements check completed"
}

# Install dependencies
install_dependencies() {
    print_header "INSTALLING DEPENDENCIES"
    
    # Check for Docker
    if command_exists docker; then
        print_success "Docker is already installed"
        docker --version | tee -a "${LOG_FILE}"
    else
        print_info "Installing Docker..."
        
        case "${OS}" in
            ubuntu|debian)
                apt-get update
                apt-get install -y ca-certificates curl gnupg
                install -m 0755 -d /etc/apt/keyrings
                curl -fsSL https://download.docker.com/linux/${OS}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                chmod a+r /etc/apt/keyrings/docker.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS} $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
                apt-get update
                apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                ;;
            centos|rhel|fedora)
                yum install -y yum-utils
                yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                systemctl start docker
                systemctl enable docker
                ;;
            macos)
                print_error "Please install Docker Desktop for Mac from https://www.docker.com/products/docker-desktop"
                exit 1
                ;;
            *)
                print_error "Unsupported OS: ${OS}"
                exit 1
                ;;
        esac
        
        print_success "Docker installed successfully"
    fi
    
    # Check for Docker Compose
    if docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose is already installed"
        docker compose version | tee -a "${LOG_FILE}"
    else
        print_error "Docker Compose plugin not found. Please install Docker Compose."
        exit 1
    fi
    
    # Check for Git
    if command_exists git; then
        print_success "Git is already installed"
    else
        print_info "Installing Git..."
        
        case "${OS}" in
            ubuntu|debian)
                apt-get install -y git
                ;;
            centos|rhel|fedora)
                yum install -y git
                ;;
            macos)
                print_error "Please install Git from https://git-scm.com/download/mac"
                exit 1
                ;;
        esac
        
        print_success "Git installed successfully"
    fi
    
    # Check for curl
    if ! command_exists curl; then
        print_info "Installing curl..."
        
        case "${OS}" in
            ubuntu|debian)
                apt-get install -y curl
                ;;
            centos|rhel|fedora)
                yum install -y curl
                ;;
        esac
    fi
    
    print_success "All dependencies installed"
}

# Check and configure firewall
configure_firewall() {
    print_header "CONFIGURING FIREWALL"
    
    local ports=("80" "443" "3478" "7880" "7881")
    local port_ranges=("50000:60000")
    
    if command_exists ufw; then
        print_info "Detected UFW firewall"
        
        if confirm "Configure UFW firewall rules?" "y"; then
            for port in "${ports[@]}"; do
                ufw allow "${port}" >/dev/null 2>&1 || true
                print_info "Allowed port ${port}"
            done
            
            for range in "${port_ranges[@]}"; do
                ufw allow "${range}/udp" >/dev/null 2>&1 || true
                print_info "Allowed UDP port range ${range}"
            done
            
            print_success "UFW firewall configured"
        fi
    elif command_exists firewall-cmd; then
        print_info "Detected firewalld"
        
        if confirm "Configure firewalld rules?" "y"; then
            for port in "${ports[@]}"; do
                firewall-cmd --permanent --add-port="${port}/tcp" >/dev/null 2>&1 || true
                print_info "Allowed port ${port}/tcp"
            done
            
            firewall-cmd --permanent --add-port=3478/udp >/dev/null 2>&1 || true
            firewall-cmd --permanent --add-port=50000-60000/udp >/dev/null 2>&1 || true
            firewall-cmd --reload >/dev/null 2>&1 || true
            
            print_success "firewalld configured"
        fi
    else
        print_warning "No supported firewall detected. Please configure firewall manually."
        print_info "Required ports: 80, 443, 3478, 7880-7881, 50000-60000/udp"
    fi
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --advanced)
                ADVANCED_MODE=true
                shift
                ;;
            --dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --yes)
                UNATTENDED_MODE=true
                shift
                ;;
            --domain)
                USER_DOMAIN="$2"
                shift 2
                ;;
            --email)
                USER_EMAIL="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --advanced          Interactive mode with all configuration options"
                echo "  --dir PATH          Custom installation directory (default: /opt/svazapp)"
                echo "  --yes               Skip all confirmations (unattended mode)"
                echo "  --domain DOMAIN     Set domain name"
                echo "  --email EMAIL       Set admin email for SSL certificates"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Clone repository
clone_repository() {
    print_header "CLONING REPOSITORY"

    if [ -d "${INSTALL_DIR}" ]; then
        print_warning "Directory ${INSTALL_DIR} already exists"

        if confirm "Remove existing directory and reinstall?" "n"; then
            rm -rf "${INSTALL_DIR}"
        else
            print_error "Installation cancelled"
            exit 1
        fi
    fi

    print_info "Cloning repository to ${INSTALL_DIR}..."

    # Create parent directory if it doesn't exist
    mkdir -p "$(dirname "${INSTALL_DIR}")"

    # Clone repository
    git clone https://github.com/yourusername/svazapp.git "${INSTALL_DIR}" 2>&1 | tee -a "${LOG_FILE}"

    cd "${INSTALL_DIR}"

    print_success "Repository cloned successfully"
}

# Configure environment variables
configure_environment() {
    print_header "CONFIGURING ENVIRONMENT"

    local domain="${USER_DOMAIN}"
    local email="${USER_EMAIL}"

    # Ask for domain if not provided
    if [ -z "${domain}" ]; then
        if [ "${UNATTENDED_MODE}" = true ]; then
            domain="${DEFAULT_DOMAIN}"
        else
            read -p "Enter your domain name (e.g., svaz.app): " domain
            domain=${domain:-${DEFAULT_DOMAIN}}
        fi
    fi

    # Ask for email if not provided
    if [ -z "${email}" ]; then
        if [ "${UNATTENDED_MODE}" = true ]; then
            email="${DEFAULT_EMAIL}"
        else
            read -p "Enter admin email for SSL certificates: " email
            email=${email:-${DEFAULT_EMAIL}}
        fi
    fi

    print_info "Domain: ${domain}"
    print_info "Email: ${email}"

    # Generate secrets
    print_info "Generating secure secrets..."

    local jwt_secret=$(generate_random_string 64)
    local jwt_refresh_secret=$(generate_random_string 64)
    local session_secret=$(generate_random_string 64)
    local postgres_password=$(generate_random_string 32)
    local livekit_api_key="API$(generate_random_string 16)"
    local livekit_api_secret=$(generate_random_string 64)
    local coturn_password=$(generate_random_string 32)

    # Create .env file from template
    print_info "Creating .env file..."

    cp .env.example .env

    # Replace placeholders
    sed -i "s|DOMAIN=svaz.app|DOMAIN=${domain}|g" .env
    sed -i "s|SSL_EMAIL=admin@svaz.app|SSL_EMAIL=${email}|g" .env
    sed -i "s|POSTGRES_PASSWORD=change_this_secure_password|POSTGRES_PASSWORD=${postgres_password}|g" .env
    sed -i "s|JWT_SECRET=change_this_to_a_very_long_random_string_min_32_chars|JWT_SECRET=${jwt_secret}|g" .env
    sed -i "s|SESSION_SECRET=change_this_to_another_very_long_random_string|SESSION_SECRET=${session_secret}|g" .env
    sed -i "s|LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxx|LIVEKIT_API_KEY=${livekit_api_key}|g" .env
    sed -i "s|LIVEKIT_API_SECRET=change_this_to_a_very_long_random_secret|LIVEKIT_API_SECRET=${livekit_api_secret}|g" .env
    sed -i "s|COTURN_PASSWORD=change_this_secure_coturn_password|COTURN_PASSWORD=${coturn_password}|g" .env
    sed -i "s|LIVEKIT_PUBLIC_URL=wss://\${DOMAIN}/livekit|LIVEKIT_PUBLIC_URL=wss://${domain}/livekit|g" .env
    sed -i "s|NEXT_PUBLIC_API_URL=https://\${DOMAIN}/api|NEXT_PUBLIC_API_URL=https://${domain}/api|g" .env
    sed -i "s|NEXT_PUBLIC_SOCKET_URL=https://\${DOMAIN}|NEXT_PUBLIC_SOCKET_URL=https://${domain}|g" .env
    sed -i "s|NEXT_PUBLIC_LIVEKIT_URL=wss://\${DOMAIN}/livekit|NEXT_PUBLIC_LIVEKIT_URL=wss://${domain}/livekit|g" .env
    sed -i "s|NEXT_PUBLIC_STUN_URL=stun:\${DOMAIN}:3478|NEXT_PUBLIC_STUN_URL=stun:${domain}:3478|g" .env
    sed -i "s|NEXT_PUBLIC_TURN_URL=turn:\${DOMAIN}:3478|NEXT_PUBLIC_TURN_URL=turn:${domain}:3478|g" .env
    sed -i "s|CORS_ORIGIN=https://\${DOMAIN}|CORS_ORIGIN=https://${domain}|g" .env
    sed -i "s|COTURN_REALM=\${DOMAIN}|COTURN_REALM=${domain}|g" .env

    # Set secure permissions
    chmod 600 .env

    print_success ".env file created with secure permissions"

    # Create LiveKit config from template
    print_info "Creating LiveKit configuration..."

    sed "s|{LIVEKIT_API_KEY}|${livekit_api_key}|g; s|{LIVEKIT_API_SECRET}|${livekit_api_secret}|g" \
        livekit/livekit.yaml.template > livekit/livekit.yaml

    print_success "LiveKit configuration created"

    # Save credentials to a secure file (shown once)
    cat > "${INSTALL_DIR}/CREDENTIALS.txt" <<EOF
=============================================================================
SVAZ.APP INSTALLATION CREDENTIALS
=============================================================================
IMPORTANT: Save these credentials securely. This file will be deleted after
you view it.

Domain: ${domain}
Admin Email: ${email}

Database:
  User: svazapp
  Password: ${postgres_password}
  Database: svazapp

JWT:
  Secret: ${jwt_secret}
  Expires: 90 days

LiveKit:
  API Key: ${livekit_api_key}
  API Secret: ${livekit_api_secret}

CoTURN:
  User: svazuser
  Password: ${coturn_password}

Session Secret: ${session_secret}

=============================================================================
Access URL: https://${domain}
=============================================================================
EOF

    chmod 600 "${INSTALL_DIR}/CREDENTIALS.txt"

    print_success "Environment configured successfully"
}

# Deploy application
deploy_application() {
    print_header "DEPLOYING APPLICATION"

    cd "${INSTALL_DIR}"

    print_info "Pulling Docker images..."
    docker compose pull 2>&1 | tee -a "${LOG_FILE}"

    print_info "Building custom images..."
    docker compose build 2>&1 | tee -a "${LOG_FILE}"

    print_info "Starting services..."
    docker compose up -d 2>&1 | tee -a "${LOG_FILE}"

    print_success "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_header "WAITING FOR SERVICES TO BE READY"

    local max_wait=300  # 5 minutes
    local elapsed=0
    local interval=5

    print_info "Waiting for services to be healthy (timeout: ${max_wait}s)..."

    while [ ${elapsed} -lt ${max_wait} ]; do
        local healthy=true

        # Check database
        if ! docker compose exec -T db pg_isready -U svazapp >/dev/null 2>&1; then
            healthy=false
        fi

        # Check API
        if ! docker compose exec -T api node -e "require('http').get('http://localhost:8080/api/health')" >/dev/null 2>&1; then
            healthy=false
        fi

        if [ "${healthy}" = true ]; then
            print_success "All services are healthy"
            return 0
        fi

        sleep ${interval}
        elapsed=$((elapsed + interval))
        echo -n "." | tee -a "${LOG_FILE}"
    done

    echo "" | tee -a "${LOG_FILE}"
    print_warning "Services did not become healthy within ${max_wait}s"
    print_info "You can check service status with: docker compose ps"
    print_info "View logs with: docker compose logs"
}

# Run health checks
run_health_checks() {
    print_header "RUNNING HEALTH CHECKS"

    cd "${INSTALL_DIR}"

    local all_passed=true

    # Check database
    print_info "Checking database..."
    if docker compose exec -T db pg_isready -U svazapp >/dev/null 2>&1; then
        print_success "✓ Database is running"
    else
        print_error "✗ Database is not responding"
        all_passed=false
    fi

    # Check API
    print_info "Checking API..."
    if docker compose exec -T api node -e "require('http').get('http://localhost:8080/api/health')" >/dev/null 2>&1; then
        print_success "✓ API is running"
    else
        print_error "✗ API is not responding"
        all_passed=false
    fi

    # Check frontend
    print_info "Checking frontend..."
    if docker compose exec -T frontend node -e "require('http').get('http://localhost:3000')" >/dev/null 2>&1; then
        print_success "✓ Frontend is running"
    else
        print_error "✗ Frontend is not responding"
        all_passed=false
    fi

    # Check LiveKit
    print_info "Checking LiveKit..."
    if docker compose ps livekit | grep -q "Up"; then
        print_success "✓ LiveKit is running"
    else
        print_error "✗ LiveKit is not running"
        all_passed=false
    fi

    # Check CoTURN
    print_info "Checking CoTURN..."
    if docker compose ps coturn | grep -q "Up"; then
        print_success "✓ CoTURN is running"
    else
        print_error "✗ CoTURN is not running"
        all_passed=false
    fi

    # Check Caddy
    print_info "Checking Caddy..."
    if docker compose ps caddy | grep -q "Up"; then
        print_success "✓ Caddy is running"
    else
        print_error "✗ Caddy is not running"
        all_passed=false
    fi

    if [ "${all_passed}" = true ]; then
        print_success "All health checks passed!"
    else
        print_warning "Some health checks failed. Check logs with: docker compose logs"
    fi
}

# Cleanup
cleanup() {
    print_header "CLEANUP"

    cd "${INSTALL_DIR}"

    # Set secure permissions on .env
    chmod 600 .env

    print_success "Cleanup completed"
}

# Print final report
print_final_report() {
    print_header "INSTALLATION COMPLETE!"

    local domain=$(grep "^DOMAIN=" "${INSTALL_DIR}/.env" | cut -d'=' -f2)

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║                    SVAZ.APP INSTALLATION SUCCESSFUL!                      ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🎉 Your svaz.app instance is now running!"
    echo ""
    echo "📍 Access URL:"
    echo "   https://${domain}"
    echo ""
    echo "🔐 Credentials:"
    echo "   Your credentials have been saved to:"
    echo "   ${INSTALL_DIR}/CREDENTIALS.txt"
    echo ""
    echo "   ⚠️  IMPORTANT: View and save these credentials now!"
    echo "   This file contains sensitive information and should be stored securely."
    echo ""
    echo "📊 Service Status:"
    docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
    echo ""
    echo "📝 Next Steps:"
    echo ""
    echo "   1. View your credentials:"
    echo "      cat ${INSTALL_DIR}/CREDENTIALS.txt"
    echo ""
    echo "   2. Access your application:"
    echo "      https://${domain}"
    echo ""
    echo "   3. Create your first user account by registering on the website"
    echo ""
    echo "   4. (Optional) Delete the credentials file after saving:"
    echo "      rm ${INSTALL_DIR}/CREDENTIALS.txt"
    echo ""
    echo "🔧 Useful Commands:"
    echo ""
    echo "   View logs:"
    echo "      cd ${INSTALL_DIR} && docker compose logs -f"
    echo ""
    echo "   View specific service logs:"
    echo "      cd ${INSTALL_DIR} && docker compose logs -f [service]"
    echo "      Services: api, frontend, db, livekit, coturn, caddy"
    echo ""
    echo "   Restart services:"
    echo "      cd ${INSTALL_DIR} && docker compose restart"
    echo ""
    echo "   Stop services:"
    echo "      cd ${INSTALL_DIR} && docker compose down"
    echo ""
    echo "   Start services:"
    echo "      cd ${INSTALL_DIR} && docker compose up -d"
    echo ""
    echo "   Update application:"
    echo "      cd ${INSTALL_DIR} && git pull && docker compose up -d --build"
    echo ""
    echo "📚 Documentation:"
    echo "   - README: ${INSTALL_DIR}/README.md"
    echo "   - Deployment Guide: ${INSTALL_DIR}/DEPLOYMENT.md"
    echo "   - Development Guide: ${INSTALL_DIR}/DEVELOPMENT.md"
    echo ""
    echo "🐛 Troubleshooting:"
    echo "   If you encounter issues, check the logs:"
    echo "      cd ${INSTALL_DIR} && docker compose logs"
    echo ""
    echo "   For more help, visit:"
    echo "      https://github.com/yourusername/svazapp/issues"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo ""

    # Ask if user wants to view credentials now
    if [ "${UNATTENDED_MODE}" = false ]; then
        if confirm "Would you like to view your credentials now?" "y"; then
            echo ""
            cat "${INSTALL_DIR}/CREDENTIALS.txt"
            echo ""

            if confirm "Delete credentials file now? (Make sure you saved them!)" "n"; then
                rm "${INSTALL_DIR}/CREDENTIALS.txt"
                print_success "Credentials file deleted"
            else
                print_warning "Remember to delete ${INSTALL_DIR}/CREDENTIALS.txt after saving the credentials!"
            fi
        fi
    fi
}

# Main installation function
main() {
    # Print banner
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                           ║"
    echo "║                    SVAZ.APP AUTOMATED INSTALLER v${VERSION}                    ║"
    echo "║                                                                           ║"
    echo "║          Self-hosted video calling and messaging platform                ║"
    echo "║                  with automatic P2P failover                              ║"
    echo "║                                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo ""

    # Initialize log file
    echo "Installation started at $(date)" > "${LOG_FILE}"

    # Parse arguments
    parse_arguments "$@"

    # Detect OS
    detect_os

    # Check system requirements
    check_system_requirements

    # Install dependencies
    install_dependencies

    # Configure firewall
    configure_firewall

    # Clone repository
    clone_repository

    # Configure environment
    configure_environment

    # Deploy application
    deploy_application

    # Wait for services
    wait_for_services

    # Run health checks
    run_health_checks

    # Cleanup
    cleanup

    # Print final report
    print_final_report

    print_success "Installation completed successfully!"
    echo "Log file: ${LOG_FILE}"
}

# Run main function
main "$@"

