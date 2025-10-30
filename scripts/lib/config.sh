#!/usr/bin/env bash
set -e

# =============================================================================
# CONFIGURATION COLLECTION
# =============================================================================

# Detect external IP for TURN server
detect_and_confirm_external_ip() {
    echo ""
    print_info "Detecting external IP address for TURN server..."
    echo ""
    echo "ℹ️  TURN server needs to know the external IP address to work properly through NAT."
    echo ""

    # Try to resolve domain IP
    local detected_ip=""
    if command -v dig >/dev/null 2>&1; then
        detected_ip=$(dig +short "$USER_DOMAIN" A | head -n1)
    elif command -v nslookup >/dev/null 2>&1; then
        detected_ip=$(nslookup "$USER_DOMAIN" | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -n1)
    elif command -v host >/dev/null 2>&1; then
        detected_ip=$(host "$USER_DOMAIN" | grep "has address" | awk '{print $4}' | head -n1)
    fi

    # Show detected IP
    if [ -n "$detected_ip" ]; then
        echo "✅ Detected IP for $USER_DOMAIN: $detected_ip"
        echo ""
        read_input "External IP address (press Enter to use detected IP)" "$detected_ip" EXTERNAL_IP
    else
        echo "⚠️  Could not automatically detect IP for $USER_DOMAIN"
        echo ""
        read_input "External IP address (required for TURN server)" "" EXTERNAL_IP
    fi

    # Validate IP format
    if [[ ! "$EXTERNAL_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        print_error "Invalid IP address format: $EXTERNAL_IP"
        print_error "Please enter a valid IPv4 address (e.g., 192.168.1.1)"
        detect_and_confirm_external_ip  # Retry
        return
    fi

    echo "✅ External IP set to: $EXTERNAL_IP"
    echo ""
}

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
    
    # Detect external IP for TURN server
    detect_and_confirm_external_ip

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

    # Detect external IP for TURN server
    detect_and_confirm_external_ip

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
    
    # URL-encode the password for the DATABASE_URL string
    local postgres_password_encoded=$(echo "$postgres_password" | sed \
        -e 's:%:%25:g' \
        -e 's:/:%2F:g' \
        -e 's:?:%3F:g' \
        -e 's:#:%23:g' \
        -e 's:&:%26:g' \
        -e 's:=:%3D:g' \
        -e 's:@:%40:g' \
        -e 's: :%20:g' \
        -e 's:+:%2B:g')
    
    # Replace values in .env
    sed -i "s|DOMAIN=.*|DOMAIN=$USER_DOMAIN|" .env
    sed -i "s|SSL_EMAIL=.*|SSL_EMAIL=$USER_EMAIL|" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" .env
    sed -i "s|COTURN_PASSWORD=.*|COTURN_PASSWORD=$coturn_password|" .env
    sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$session_secret|" .env
    sed -i "s|LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=$livekit_api_key|" .env
    sed -i "s|LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$livekit_api_secret|" .env
    sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$postgres_password|" .env
    sed -i "s|DATABASE_URL=postgresql://svazapp:.*@db:5432/svazapp|DATABASE_URL=postgresql://svazapp:$postgres_password_encoded@db:5432/svazapp|" .env
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$USER_DOMAIN|" .env
    sed -i "s|EXTERNAL_IP=.*|EXTERNAL_IP=$EXTERNAL_IP|" .env
    
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
    
    # Generate LiveKit configuration after .env is created (moved to after env loading)
    # generate_livekit_config
}

# Generate LiveKit configuration file from template
generate_livekit_config() {
    print_step "Generating LiveKit configuration..."
    
    # Check if required environment variables are set
    if [ -z "${LIVEKIT_API_KEY+x}" ]; then
        print_error "LIVEKIT_API_KEY environment variable is not set"
        exit 1
    fi
    
    if [ -z "${LIVEKIT_API_SECRET+x}" ]; then
        print_error "LIVEKIT_API_SECRET environment variable is not set"
        exit 1
    fi
    
    # Check if template exists
    if [ ! -f "livekit/livekit.yaml.template" ]; then
        print_error "LiveKit template file livekit/livekit.yaml.template not found"
        exit 1
    fi
    
    # Ensure livekit directory exists
    mkdir -p livekit
    
    # Check if livekit.yaml already exists and was generated from the template
    # If it exists, we'll regenerate it to ensure it has the correct values from .env
    cp livekit/livekit.yaml.template livekit/livekit.yaml
    
    # Replace template values with environment variables using sed
    sed -i "s|{LIVEKIT_API_KEY}|${LIVEKIT_API_KEY}|g" livekit/livekit.yaml
    sed -i "s|{LIVEKIT_API_SECRET}|${LIVEKIT_API_SECRET}|g" livekit/livekit.yaml
    
    print_success "LiveKit configuration generated"
}

