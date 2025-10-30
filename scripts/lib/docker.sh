#!/usr/bin/env bash

# =============================================================================
# DOCKER INSTALLATION
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
            # Use safe apt update with retry logic
            safe_apt_update || exit 1

            sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

            # Use safe apt update again after adding Docker repo
            safe_apt_update || exit 1

            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin gettext-base jq
            ;;
        centos|rhel|fedora)
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin gettext-base jq
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

# =============================================================================
# SYSTEM COMPATIBILITY CHECKS
# =============================================================================

# Detect existing Docker containers
detect_existing_docker_containers() {
    if ! command -v docker &> /dev/null; then
        return 1
    fi

    local running_containers=$(docker ps -q 2>/dev/null | wc -l)
    if [ "$running_containers" -gt 0 ]; then
        return 0  # Has running containers
    fi
    return 1  # No running containers
}

# Check if port is in use
check_port_conflict() {
    local port=$1
    local protocol=${2:-tcp}

    # Check if port is bound by any process
    if command -v ss &> /dev/null; then
        if ss -ln${protocol:0:1} | grep -q ":$port "; then
            return 0  # Port is in use
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -ln${protocol:0:1} | grep -q ":$port "; then
            return 0  # Port is in use
        fi
    fi
    return 1  # Port is free
}

# Get process using port
get_port_owner() {
    local port=$1
    local protocol=${2:-tcp}

    if command -v ss &> /dev/null; then
        ss -lnp${protocol:0:1} | grep ":$port " | awk '{print $NF}' | head -1
    elif command -v lsof &> /dev/null; then
        lsof -i ${protocol}:${port} -t 2>/dev/null | head -1 | xargs ps -p 2>/dev/null | tail -1
    else
        echo "unknown"
    fi
}

# Check all required ports
check_port_conflicts() {
    print_step "Checking for port conflicts..."

    local conflicts=()
    local ports_to_check=()

    # Determine which ports we need based on scenario
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        # Standalone: Caddy + CoTURN
        ports_to_check=(80 443 3478 5349)
    else
        # External proxy mode: Frontend, API, LiveKit, CoTURN
        # NOTE: PostgreSQL (5432) is NOT exposed to host, only internal Docker network
        ports_to_check=(3000 8080 7880 3478 5349)
    fi

    # Check each port
    for port in "${ports_to_check[@]}"; do
        if check_port_conflict "$port"; then
            local owner=$(get_port_owner "$port")
            conflicts+=("Port $port is already in use by: $owner")
        fi
    done

    if [ ${#conflicts[@]} -gt 0 ]; then
        print_warning "⚠️  Port conflicts detected:"
        echo ""
        for conflict in "${conflicts[@]}"; do
            echo "  ❌ $conflict"
        done
        echo ""
        echo "These ports are required by svaz.app:"
        if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
            echo "  - 80, 443: Caddy (HTTP/HTTPS)"
        else
            echo "  - 3000: Frontend (Next.js)"
            echo "  - 8080: API (Fastify)"
            echo "  - 7880: LiveKit (WebRTC SFU)"
        fi
        echo "  - 3478, 5349: CoTURN (STUN/TURN)"
        echo ""
        echo "NOTE: PostgreSQL (5432) is NOT exposed to host for security."
        echo "      It's only accessible within Docker network."
        echo ""

        if ! ask_yes_no "Continue anyway? (Installation may fail)" "n"; then
            print_error "Installation cancelled due to port conflicts"
            exit 1
        fi
    else
        print_success "✓ No port conflicts detected"
    fi
}

# =============================================================================
# FIREWALL CONFIGURATION (MINIMAL, NON-INVASIVE)
# =============================================================================

# Configure firewall
configure_firewall() {
    print_step "Configuring firewall..."

    if ! command -v ufw &> /dev/null; then
        print_warning "UFW not installed, skipping firewall configuration"
        print_info "Make sure to manually configure your firewall to allow required ports"
        return 0
    fi

    # Check if UFW is already enabled
    local ufw_status=$(sudo ufw status | head -1)
    local ufw_was_active=false

    if echo "$ufw_status" | grep -q "Status: active"; then
        ufw_was_active=true
        print_warning "⚠️  UFW is already active with existing rules"
        echo ""
        echo "IMPORTANT: We will NOT modify your global firewall configuration."
        echo "We will ONLY add the specific ports required by svaz.app."
        echo ""

        # Check if Docker is running
        if detect_existing_docker_containers; then
            print_warning "⚠️  Detected running Docker containers on this server"
            echo ""
            echo "To avoid breaking your existing containers, we will:"
            echo "  1. Add ONLY svaz.app ports to UFW (no global changes)"
            echo "  2. NOT reload UFW (to avoid disrupting existing containers)"
            echo "  3. NOT modify DEFAULT_FORWARD_POLICY"
            echo "  4. NOT add global Docker network rules"
            echo ""
            echo "Your existing containers will continue working normally."
            echo "New UFW rules will take effect after system reboot."
            echo ""
        fi

        if ! ask_yes_no "Add svaz.app ports to existing UFW configuration?" "y"; then
            print_info "Skipping firewall configuration"
            print_warning "⚠️  Make sure to manually open required ports!"
            return 0
        fi
    else
        if ! ask_yes_no "Configure firewall (UFW) automatically?" "y"; then
            print_info "Skipping firewall configuration"
            return 0
        fi
    fi

    # Add application-specific rules ONLY (non-destructive)
    print_info "Adding svaz.app ports to UFW..."
    echo ""

    # Allow SSH first (CRITICAL - prevents lockout!)
    sudo ufw allow 22/tcp comment 'SSH' 2>/dev/null || true

    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        # Standalone mode: Caddy handles HTTP/HTTPS
        sudo ufw allow 80/tcp comment 'svaz.app HTTP' 2>/dev/null || true
        sudo ufw allow 443/tcp comment 'svaz.app HTTPS' 2>/dev/null || true
        sudo ufw allow 443/udp comment 'svaz.app HTTP/3' 2>/dev/null || true
    else
        # External proxy mode: Expose frontend, API, LiveKit
        sudo ufw allow 3000/tcp comment 'svaz.app Frontend' 2>/dev/null || true
        sudo ufw allow 8080/tcp comment 'svaz.app API' 2>/dev/null || true
        sudo ufw allow 7880/tcp comment 'svaz.app LiveKit' 2>/dev/null || true
    fi

    # CoTURN ports (both scenarios)
    sudo ufw allow 3478/tcp comment 'svaz.app CoTURN STUN/TURN' 2>/dev/null || true
    sudo ufw allow 3478/udp comment 'svaz.app CoTURN STUN/TURN' 2>/dev/null || true
    sudo ufw allow 5349/tcp comment 'svaz.app CoTURN TURNS' 2>/dev/null || true
    sudo ufw allow 5349/udp comment 'svaz.app CoTURN TURNS' 2>/dev/null || true
    sudo ufw allow 49152:65535/udp comment 'svaz.app CoTURN relay' 2>/dev/null || true

    # Enable firewall (if not already enabled)
    if ! $ufw_was_active; then
        print_info "Enabling UFW with default policies..."
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw --force enable
        print_success "✓ UFW enabled"
    else
        # UFW was already active - do NOT reload if Docker is running
        if detect_existing_docker_containers; then
            print_warning "⚠️  UFW rules added but NOT reloaded (Docker containers are running)"
            print_info "New rules will take effect after system reboot or manual reload"
            print_info "To manually reload: docker compose down && sudo ufw reload && docker compose up -d"
        else
            print_info "Reloading UFW to apply new rules..."
            sudo ufw reload
            print_success "✓ UFW reloaded"
        fi
    fi

    print_success "Firewall configured successfully"
    echo ""
    print_info "UFW Status (svaz.app rules):"
    sudo ufw status | grep -E "svaz\.app|CoTURN|SSH" || echo "  (No svaz.app rules found - may need reboot)"
    echo ""

    if detect_existing_docker_containers; then
        print_info "✓ Your existing Docker containers were not affected"
        print_info "✓ No global Docker/iptables changes were made"
    fi
}

