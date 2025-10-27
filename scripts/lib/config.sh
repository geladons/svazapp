#!/usr/bin/env bash

# =============================================================================
# CONFIGURATION COLLECTION
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

