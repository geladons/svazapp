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

