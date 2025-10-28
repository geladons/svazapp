#!/usr/bin/env bash

# =============================================================================
# DEPLOYMENT FUNCTIONS
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

# Clean up old containers
cleanup_old_containers() {
    print_step "Cleaning up old containers..."

    local compose_file
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        compose_file="docker-compose.yml"
    else
        compose_file="docker-compose.external-proxy.yml"
    fi

    # Stop and remove old containers if they exist
    if docker compose -f "$compose_file" ps -q 2>/dev/null | grep -q .; then
        print_info "Stopping and removing old containers..."
        docker compose -f "$compose_file" down --remove-orphans --timeout 10 || true
    else
        print_info "No old containers found"
    fi

    print_success "Cleanup complete"
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
    print_info "Pulling Docker images..."
    docker compose -f "$compose_file" pull || true

    # Build services
    print_info "Building services (this may take 5-10 minutes)..."
    docker compose -f "$compose_file" build

    # Start services
    print_info "Starting services..."
    print_info "This may take 1-2 minutes for all services to become healthy..."
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
    print_info "Waiting for services to initialize..."
    sleep 20

    # Show container status
    echo ""
    print_info "Container Status:"
    docker compose -f "$compose_file" ps
    echo ""

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

        # Check if SSL was configured via DNS API
        if [ "$COTURN_SSL_METHOD" = "dns-api" ]; then
            echo -e "1. ${CYAN}CoTURN SSL Status:${NC}"
            echo "   ${GREEN}✓${NC} SSL certificates obtained automatically via DNS API"
            echo "   ${GREEN}✓${NC} Automatic renewal configured (runs monthly)"
            echo ""
            echo -e "2. ${CYAN}Configure your reverse proxy (NPM/Traefik):${NC}"
        else
            echo -e "1. ${CYAN}Configure SSL for CoTURN TURNS (CRITICAL):${NC}"
            echo "   ${YELLOW}⚠${NC}  You selected manual SSL setup"
            echo "   ${YELLOW}⚠${NC}  See: $INSTALL_DIR/coturn-certs/README.md"
            echo "   ${YELLOW}⚠${NC}  Video calls will NOT work in DPI networks without SSL!"
            echo ""
            echo -e "2. ${CYAN}Configure your reverse proxy (NPM/Traefik):${NC}"
        fi

        echo "   - Create ONE proxy host for: $USER_DOMAIN"
        echo "   - Forward / to: your-vps-ip:3000 (Frontend)"
        echo "   - Add custom location /api to: your-vps-ip:8080"
        echo "   - Add custom location /livekit to: your-vps-ip:7880"
        echo "   - Enable WebSocket support on all locations"
        echo ""
        echo -e "3. ${CYAN}Configure router port forwarding:${NC}"
        echo "   - Forward ports 3478, 5349, 49152-65535 to your VPS"
        echo "   - These ports are for CoTURN (cannot be proxied)"
        echo ""
        echo -e "4. ${CYAN}Access your application:${NC}"
        echo "   https://$USER_DOMAIN"
        echo ""
        echo -e "5. ${CYAN}Check service status:${NC}"
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

