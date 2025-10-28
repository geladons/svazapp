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

    print_warning "⚠️  IMPORTANT: Configuring UFW for Docker compatibility"
    echo ""
    echo "UFW must be configured BEFORE enabling to avoid breaking Docker networking."
    echo "We will:"
    echo "  1. Configure UFW to allow Docker traffic"
    echo "  2. Add rules for required ports"
    echo "  3. Enable UFW with Docker-compatible settings"
    echo ""

    # Disable UFW first to ensure clean state
    sudo ufw --force disable 2>/dev/null || true

    # Configure UFW to work with Docker
    # This prevents UFW from breaking Docker's iptables rules
    print_info "Configuring UFW for Docker compatibility..."

    # Backup existing UFW config
    if [ -f /etc/default/ufw ]; then
        sudo cp /etc/default/ufw /etc/default/ufw.backup.$(date +%s) 2>/dev/null || true
    fi

    # Set DEFAULT_FORWARD_POLICY to ACCEPT (required for Docker)
    sudo sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw 2>/dev/null || true

    # Add Docker-specific rules to UFW before.rules
    if [ -f /etc/ufw/before.rules ]; then
        # Check if Docker rules already exist
        if ! grep -q "# BEGIN DOCKER RULES" /etc/ufw/before.rules; then
            print_info "Adding Docker rules to UFW..."
            sudo cp /etc/ufw/before.rules /etc/ufw/before.rules.backup.$(date +%s)

            # Add Docker rules at the end of *filter section
            sudo sed -i '/^COMMIT$/i \
# BEGIN DOCKER RULES - Allow Docker container networking\
-A ufw-before-forward -j ACCEPT -s 172.16.0.0/12 -d 172.16.0.0/12\
-A ufw-before-forward -j ACCEPT -s 10.0.0.0/8 -d 10.0.0.0/8\
# END DOCKER RULES' /etc/ufw/before.rules
        fi
    fi

    # Reset UFW to apply new settings
    print_info "Resetting UFW with new configuration..."
    echo "y" | sudo ufw reset 2>/dev/null || true

    # Set default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw default allow routed

    # Allow SSH first (CRITICAL - prevents lockout!)
    print_info "Allowing SSH (port 22)..."
    sudo ufw allow 22/tcp comment 'SSH'

    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        # Standalone mode: Caddy handles HTTP/HTTPS
        print_info "Allowing HTTP/HTTPS for Caddy..."
        sudo ufw allow 80/tcp comment 'HTTP for Caddy'
        sudo ufw allow 443/tcp comment 'HTTPS for Caddy'
        sudo ufw allow 443/udp comment 'HTTP/3 for Caddy'
    else
        # External proxy mode: Expose frontend, API, LiveKit
        print_info "Allowing application ports for external proxy..."
        sudo ufw allow 3000/tcp comment 'Frontend'
        sudo ufw allow 8080/tcp comment 'API'
        sudo ufw allow 7880/tcp comment 'LiveKit'
    fi

    # CoTURN ports (both scenarios)
    print_info "Allowing CoTURN ports..."
    sudo ufw allow 3478/tcp comment 'CoTURN STUN/TURN'
    sudo ufw allow 3478/udp comment 'CoTURN STUN/TURN'
    sudo ufw allow 5349/tcp comment 'CoTURN TURNS'
    sudo ufw allow 5349/udp comment 'CoTURN TURNS'
    sudo ufw allow 49152:65535/udp comment 'CoTURN relay ports'

    # Enable firewall with Docker-compatible settings
    print_info "Enabling UFW..."
    sudo ufw --force enable

    # Restart Docker to ensure it re-creates iptables rules
    print_info "Restarting Docker to apply firewall changes..."
    sudo systemctl restart docker

    # Wait for Docker to fully restart
    sleep 3

    print_success "Firewall configured with Docker compatibility"
    echo ""
    print_info "UFW Status:"
    sudo ufw status verbose | head -20
}

