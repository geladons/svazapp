#!/usr/bin/env bash
set -e

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

# =============================================================================
# LXC DETECTION AND WORKAROUNDS
# =============================================================================

# Detect if running in LXC container
is_lxc_container() {
    # Method 1: Check /proc/1/environ for container=lxc
    if grep -qa "container=lxc" /proc/1/environ 2>/dev/null; then
        return 0
    fi

    # Method 2: Check /proc/self/cgroup for lxc
    if grep -q "/lxc/" /proc/self/cgroup 2>/dev/null; then
        return 0
    fi

    # Method 3: Check /run/systemd/container
    if [ -f /run/systemd/container ] && grep -q "lxc" /run/systemd/container 2>/dev/null; then
        return 0
    fi

    return 1
}

# Wait for container to become healthy
wait_for_container_healthy() {
    local container_name=$1
    local max_wait=${2:-60}
    local elapsed=0

    print_info "Waiting for $container_name to become healthy..."

    while [ $elapsed -lt $max_wait ]; do
        # Check if container has healthcheck
        local has_healthcheck=$(docker inspect --format='{{if .State.Health}}true{{else}}false{{end}}' "$container_name" 2>/dev/null || echo "false")

        if [ "$has_healthcheck" = "true" ]; then
            local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
            if [ "$health" = "healthy" ]; then
                print_success "$container_name is healthy"
                return 0
            fi
        else
            # No healthcheck, just check if running
            local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "none")
            if [ "$status" = "running" ]; then
                print_success "$container_name is running"
                return 0
            fi
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    print_warning "$container_name did not become healthy within ${max_wait}s"
    return 1
}

# Wait for container to be running
wait_for_container_running() {
    local container_name=$1
    local max_wait=${2:-30}
    local elapsed=0

    while [ $elapsed -lt $max_wait ]; do
        local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "none")
        if [ "$status" = "running" ]; then
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done

    return 1
}

# =============================================================================
# STANDARD DEPLOYMENT FUNCTIONS
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

# Clean up old containers (LXC-compatible version)
cleanup_old_containers_lxc() {
    print_step "Cleaning up old containers (LXC mode)..."

    # List of container names to clean up
    local containers=(
        "svazapp-frontend"
        "svazapp-api"
        "svazapp-coturn"
        "svazapp-livekit"
        "svazapp-db"
    )

    # Stop and remove containers one by one
    for container in "${containers[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            print_info "Stopping and removing $container..."
            timeout 15 docker stop "$container" 2>/dev/null || true
            timeout 10 docker rm -f "$container" 2>/dev/null || true
        fi
    done

    # Remove network if exists
    if docker network ls --format '{{.Name}}' | grep -q "^svazapp_svazapp-network$"; then
        print_info "Removing network svazapp_svazapp-network..."
        timeout 10 docker network rm svazapp_svazapp-network 2>/dev/null || true
    fi

    print_success "Cleanup complete"
}

# Clean up old containers (standard version)
cleanup_old_containers() {
    # Check if running in LXC
    if is_lxc_container; then
        print_info "LXC environment detected - using sequential cleanup"
        cleanup_old_containers_lxc
        return
    fi

    print_step "Cleaning up old containers..."

    local compose_file
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        compose_file="docker-compose.yml"
    else
        compose_file="docker-compose.external-proxy.yml"
    fi

    # Stop and remove old containers if they exist
    if timeout 5 docker compose -f "$compose_file" ps -q 2>/dev/null | grep -q .; then
        print_info "Stopping and removing old containers..."
        timeout 30 docker compose -f "$compose_file" down --remove-orphans --timeout 10 || true
    else
        print_info "No old containers found"
    fi

    print_success "Cleanup complete"
}

# Deploy services (LXC-compatible version)
deploy_services_lxc() {
    print_step "Deploying services (LXC mode)..."

    local compose_file
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        compose_file="docker-compose.yml"
    else
        compose_file="docker-compose.external-proxy.yml"
        # Ensure coturn-certs directory exists (required for volume mount)
        mkdir -p "$INSTALL_DIR/coturn-certs"
    fi

    print_info "Using compose file: $compose_file"
    print_warning "LXC environment detected - using sequential container startup"
    print_info "This avoids Docker Compose hanging issues in LXC containers"
    echo ""

    # Pull images (with timeout)
    print_info "Pulling Docker images..."
    timeout 300 docker compose -f "$compose_file" pull || {
        print_warning "Pull timed out or failed, continuing with build..."
    }

    # Build services (with timeout)
    print_info "Building services (this may take 5-10 minutes)..."
    timeout 900 docker compose -f "$compose_file" build || {
        print_error "Build failed or timed out"
        return 1
    }

    # Create all containers (with timeout)
    print_info "Creating containers..."
    timeout 300 docker compose -f "$compose_file" create || {
        print_error "Failed to create containers"
        return 1
    }

    # Start containers sequentially in correct order
    print_info "Starting containers sequentially..."
    echo ""

    # 1. Start database
    print_info "[1/5] Starting database..."
    timeout 60 docker start svazapp-db || {
        print_error "Failed to start database"
        return 1
    }
    wait_for_container_healthy svazapp-db 60 || {
        print_warning "Database did not become healthy, but continuing..."
    }
    echo ""

    # 2. Start LiveKit
    print_info "[2/5] Starting LiveKit..."
    timeout 60 docker start svazapp-livekit || {
        print_error "Failed to start LiveKit"
        return 1
    }
    wait_for_container_running svazapp-livekit 60
    echo ""

    # 3. Start API
    print_info "[3/5] Starting API..."
    timeout 90 docker start svazapp-api || {
        print_error "Failed to start API"
        return 1
    }
    wait_for_container_healthy svazapp-api 90 || {
        print_warning "API did not become healthy, but continuing..."
    }
    echo ""

    # 4. Start CoTURN
    print_info "[4/5] Starting CoTURN..."
    timeout 90 docker start svazapp-coturn || {
        print_error "Failed to start CoTURN"
        return 1
    }
    wait_for_container_running svazapp-coturn 90
    echo ""

    # 5. Start Frontend
    print_info "[5/5] Starting Frontend..."
    timeout 60 docker start svazapp-frontend || {
        print_error "Failed to start Frontend"
        return 1
    }
    wait_for_container_running svazapp-frontend 60
    echo ""

    print_success "All services deployed successfully"
}

# Deploy services (standard version)
deploy_services() {
    # Check if running in LXC
    if is_lxc_container; then
        deploy_services_lxc
        return
    fi

    print_step "Deploying services..."

    local compose_file
    if [ "$DEPLOYMENT_SCENARIO" = "standalone" ]; then
        compose_file="docker-compose.yml"
    else
        compose_file="docker-compose.external-proxy.yml"
        # Ensure coturn-certs directory exists (required for volume mount)
        mkdir -p "$INSTALL_DIR/coturn-certs"
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

# Verify installation (LXC-compatible version)
verify_installation_lxc() {
    print_step "Verifying installation (LXC mode)..."

    # Wait for services to initialize
    print_info "Waiting for services to initialize..."
    sleep 10

    # Show container status using docker ps
    echo ""
    print_info "Container Status:"
    docker ps --filter "name=svazapp" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    # Count running containers
    local running_containers=$(docker ps --filter "name=svazapp" --format "{{.Names}}" | wc -l)
    local expected_containers=5  # db, livekit, api, coturn, frontend

    if [ "$running_containers" -eq "$expected_containers" ]; then
        print_success "All services are running ($running_containers/$expected_containers)"
    else
        print_warning "Some services may not be running ($running_containers/$expected_containers)"
        print_info "Check logs with: docker logs <container-name>"
        print_info "Example: docker logs svazapp-api"
    fi
}

# Verify installation (standard version)
verify_installation() {
    # Check if running in LXC
    if is_lxc_container; then
        verify_installation_lxc
        return
    fi

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
    timeout 10 docker compose -f "$compose_file" ps || {
        print_warning "docker compose ps timed out, using docker ps instead"
        docker ps --filter "name=svazapp" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    }
    echo ""

    # Check if all containers are running
    local running_containers=$(timeout 5 docker compose -f "$compose_file" ps --services --filter "status=running" 2>/dev/null | wc -l)
    local total_containers=$(timeout 5 docker compose -f "$compose_file" ps --services 2>/dev/null | wc -l)

    if [ "$running_containers" -eq "$total_containers" ] && [ "$total_containers" -gt 0 ]; then
        print_success "All services are running ($running_containers/$total_containers)"
    else
        # Fallback to docker ps if compose commands timeout
        running_containers=$(docker ps --filter "name=svazapp" --format "{{.Names}}" | wc -l)
        print_warning "Some services may not be running ($running_containers containers detected)"
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

