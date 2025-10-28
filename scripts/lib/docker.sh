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

    # Check if UFW is already enabled
    local ufw_status=$(sudo ufw status | head -1)
    if echo "$ufw_status" | grep -q "Status: active"; then
        print_warning "⚠️  UFW is already active with existing rules"
        echo ""
        echo "IMPORTANT: We will NOT reset your existing firewall configuration."
        echo "We will only ADD the required ports for svaz.app."
        echo ""
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

    print_info "Configuring UFW for Docker compatibility..."
    echo ""

    # Backup existing UFW config (non-destructive)
    if [ -f /etc/default/ufw ]; then
        if [ ! -f /etc/default/ufw.backup.svazapp ]; then
            sudo cp /etc/default/ufw /etc/default/ufw.backup.svazapp 2>/dev/null || true
            print_info "✓ Backed up /etc/default/ufw"
        fi
    fi

    # Set DEFAULT_FORWARD_POLICY to ACCEPT (required for Docker)
    # This is the ONLY change we make to /etc/default/ufw
    if grep -q 'DEFAULT_FORWARD_POLICY="DROP"' /etc/default/ufw 2>/dev/null; then
        print_info "Setting DEFAULT_FORWARD_POLICY=ACCEPT for Docker..."
        sudo sed -i.bak 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
        print_success "✓ DEFAULT_FORWARD_POLICY set to ACCEPT"
    else
        print_info "✓ DEFAULT_FORWARD_POLICY already set correctly"
    fi

    # Add Docker-specific rules to UFW before.rules (if not already present)
    if [ -f /etc/ufw/before.rules ]; then
        if ! grep -q "# BEGIN SVAZAPP DOCKER RULES" /etc/ufw/before.rules; then
            print_info "Adding Docker network rules to UFW..."

            # Backup before.rules
            if [ ! -f /etc/ufw/before.rules.backup.svazapp ]; then
                sudo cp /etc/ufw/before.rules /etc/ufw/before.rules.backup.svazapp
            fi

            # Add Docker rules BEFORE the final COMMIT
            sudo sed -i '/^COMMIT$/i \
# BEGIN SVAZAPP DOCKER RULES - Allow Docker container networking\
-A ufw-before-forward -j ACCEPT -s 172.16.0.0/12 -d 172.16.0.0/12\
-A ufw-before-forward -j ACCEPT -s 10.0.0.0/8 -d 10.0.0.0/8\
# END SVAZAPP DOCKER RULES' /etc/ufw/before.rules

            print_success "✓ Docker network rules added"
        else
            print_info "✓ Docker network rules already present"
        fi
    fi

    # Set default policies (only if UFW was not active before)
    if ! echo "$ufw_status" | grep -q "Status: active"; then
        print_info "Setting default UFW policies..."
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw default allow routed
    fi

    # Add application-specific rules (non-destructive - only adds if not present)
    print_info "Adding svaz.app ports to UFW..."

    # Allow SSH first (CRITICAL - prevents lockout!)
    sudo ufw allow 22/tcp comment 'SSH' 2>/dev/null || true

    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        # Standalone mode: Caddy handles HTTP/HTTPS
        sudo ufw allow 80/tcp comment 'HTTP for Caddy' 2>/dev/null || true
        sudo ufw allow 443/tcp comment 'HTTPS for Caddy' 2>/dev/null || true
        sudo ufw allow 443/udp comment 'HTTP/3 for Caddy' 2>/dev/null || true
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
    if ! echo "$ufw_status" | grep -q "Status: active"; then
        print_info "Enabling UFW..."
        sudo ufw --force enable
    else
        print_info "Reloading UFW to apply new rules..."
        sudo ufw reload
    fi

    print_success "Firewall configured successfully"
    echo ""
    print_info "UFW Status:"
    sudo ufw status verbose | head -25
    echo ""
    print_warning "⚠️  IMPORTANT: Docker will manage its own iptables rules."
    print_warning "⚠️  Do NOT restart Docker after this point - it may break networking!"
}

