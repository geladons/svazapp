#!/bin/bash
# =============================================================================
# SSL Certificate Management via DNS API
# =============================================================================
# This module provides functions for obtaining SSL certificates using DNS-01
# ACME challenge via various DNS provider APIs (Cloudflare, DigitalOcean, etc.)
# =============================================================================

# Global variables for SSL setup
COTURN_SSL_METHOD=""        # "manual" or "dns-api"
DNS_PROVIDER=""             # "cloudflare", "digitalocean", "route53", "yandex"
DNS_API_TOKEN=""            # API token/key
DNS_CREDENTIALS_DIR=""      # Path to credentials directory

# =============================================================================
# MAIN FUNCTION: Setup CoTURN SSL
# =============================================================================

setup_coturn_ssl() {
    # Only for external-proxy scenario
    if [ "$DEPLOYMENT_SCENARIO" != "external-proxy" ]; then
        return 0
    fi
    
    print_header "STEP: Configure SSL for CoTURN TURNS"
    
    echo -e "${BOLD}CoTURN requires SSL certificates for TURNS (port 5349).${NC}"
    echo -e "${YELLOW}This is CRITICAL for video calls in DPI-restricted networks (Russia, China, etc.)${NC}"
    echo ""
    echo -e "${BOLD}How do you want to obtain SSL certificates?${NC}"
    echo ""
    
    PS3=$'\n'"$(echo -e ${CYAN}Select method: ${NC})"
    
    options=(
        "Manual setup (I will provide certificates myself)"
        "Automatic via DNS API (Cloudflare, DigitalOcean, etc.)"
    )
    
    select opt in "${options[@]}"; do
        case $REPLY in
            1)
                COTURN_SSL_METHOD="manual"
                print_success "Selected: Manual SSL setup"
                echo ""
                print_info "You will need to manually provide SSL certificates after installation."
                print_info "See: $INSTALL_DIR/coturn-certs/README.md for instructions"
                break
                ;;
            2)
                COTURN_SSL_METHOD="dns-api"
                print_success "Selected: Automatic via DNS API"
                echo ""
                setup_coturn_ssl_dns
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1 or 2."
                ;;
        esac
    done </dev/tty
    
    echo ""
}

# =============================================================================
# DNS API SETUP
# =============================================================================

setup_coturn_ssl_dns() {
    print_step "Configuring automatic SSL via DNS API..."
    
    # Select DNS provider
    select_dns_provider
    
    # Collect API credentials
    collect_dns_credentials
    
    # Install certbot and DNS plugin
    install_certbot_plugin
    
    # Create credentials file
    create_dns_credentials_file
    
    # Obtain certificate
    obtain_certificate_dns
    
    # Setup automatic renewal
    setup_auto_renewal
    
    # Ask if user wants to delete credentials
    ask_delete_credentials
    
    print_success "SSL certificates configured successfully!"
}

# =============================================================================
# SELECT DNS PROVIDER
# =============================================================================

select_dns_provider() {
    echo -e "${BOLD}Select your DNS provider:${NC}"
    echo ""
    
    PS3=$'\n'"$(echo -e ${CYAN}Select provider: ${NC})"
    
    options=(
        "Cloudflare (most popular)"
        "DigitalOcean"
        "AWS Route53"
        "Yandex Cloud DNS (Russia)"
    )
    
    select opt in "${options[@]}"; do
        case $REPLY in
            1)
                DNS_PROVIDER="cloudflare"
                print_success "Selected: Cloudflare"
                break
                ;;
            2)
                DNS_PROVIDER="digitalocean"
                print_success "Selected: DigitalOcean"
                break
                ;;
            3)
                DNS_PROVIDER="route53"
                print_success "Selected: AWS Route53"
                break
                ;;
            4)
                DNS_PROVIDER="yandex"
                print_success "Selected: Yandex Cloud DNS"
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1-4."
                ;;
        esac
    done </dev/tty
    
    echo ""
}

# =============================================================================
# COLLECT DNS CREDENTIALS
# =============================================================================

collect_dns_credentials() {
    echo -e "${BOLD}Enter your DNS API credentials:${NC}"
    echo ""
    
    case $DNS_PROVIDER in
        cloudflare)
            echo -e "${CYAN}You need a Cloudflare API Token with DNS:Edit permissions.${NC}"
            echo -e "${CYAN}Get it from: https://dash.cloudflare.com/profile/api-tokens${NC}"
            echo ""
            read -p "$(echo -e ${BOLD}Cloudflare API Token: ${NC})" DNS_API_TOKEN </dev/tty
            ;;
        digitalocean)
            echo -e "${CYAN}You need a DigitalOcean Personal Access Token.${NC}"
            echo -e "${CYAN}Get it from: https://cloud.digitalocean.com/account/api/tokens${NC}"
            echo ""
            read -p "$(echo -e ${BOLD}DigitalOcean API Token: ${NC})" DNS_API_TOKEN </dev/tty
            ;;
        route53)
            echo -e "${CYAN}You need AWS Access Key ID and Secret Access Key.${NC}"
            echo -e "${CYAN}Get them from: https://console.aws.amazon.com/iam/home#/security_credentials${NC}"
            echo ""
            read -p "$(echo -e ${BOLD}AWS Access Key ID: ${NC})" AWS_ACCESS_KEY_ID </dev/tty
            read -p "$(echo -e ${BOLD}AWS Secret Access Key: ${NC})" AWS_SECRET_ACCESS_KEY </dev/tty
            ;;
        yandex)
            echo -e "${CYAN}You need a Yandex Cloud IAM Token and Folder ID.${NC}"
            echo -e "${CYAN}Get them from: https://console.cloud.yandex.ru/folders${NC}"
            echo ""
            read -p "$(echo -e ${BOLD}Yandex IAM Token: ${NC})" YANDEX_IAM_TOKEN </dev/tty
            read -p "$(echo -e ${BOLD}Yandex Folder ID: ${NC})" YANDEX_FOLDER_ID </dev/tty
            ;;
    esac
    
    echo ""
    
    # Validate credentials are not empty
    if [ -z "$DNS_API_TOKEN" ] && [ -z "$AWS_ACCESS_KEY_ID" ] && [ -z "$YANDEX_IAM_TOKEN" ]; then
        print_error "API credentials cannot be empty"
        exit 1
    fi
}

# =============================================================================
# INSTALL CERTBOT AND DNS PLUGIN
# =============================================================================

install_certbot_plugin() {
    print_step "Installing certbot and DNS plugin..."
    
    # Install certbot
    if ! command -v certbot &> /dev/null; then
        apt-get update -qq
        apt-get install -y certbot python3-certbot
    fi
    
    # Install DNS plugin
    case $DNS_PROVIDER in
        cloudflare)
            apt-get install -y python3-certbot-dns-cloudflare
            ;;
        digitalocean)
            apt-get install -y python3-certbot-dns-digitalocean
            ;;
        route53)
            apt-get install -y python3-certbot-dns-route53
            ;;
        yandex)
            # Yandex doesn't have official certbot plugin, will use manual DNS
            print_warning "Yandex Cloud DNS requires manual DNS record creation"
            ;;
    esac
    
    print_success "Certbot and DNS plugin installed"
}

# =============================================================================
# CREATE DNS CREDENTIALS FILE
# =============================================================================

create_dns_credentials_file() {
    print_step "Creating DNS credentials file..."
    
    # Create credentials directory
    DNS_CREDENTIALS_DIR="$INSTALL_DIR/coturn-certs/dns-credentials"
    mkdir -p "$DNS_CREDENTIALS_DIR"
    
    local creds_file=""
    
    case $DNS_PROVIDER in
        cloudflare)
            creds_file="$DNS_CREDENTIALS_DIR/cloudflare.ini"
            cat > "$creds_file" << EOF
# Cloudflare API token
dns_cloudflare_api_token = $DNS_API_TOKEN
EOF
            ;;
        digitalocean)
            creds_file="$DNS_CREDENTIALS_DIR/digitalocean.ini"
            cat > "$creds_file" << EOF
# DigitalOcean API token
dns_digitalocean_token = $DNS_API_TOKEN
EOF
            ;;
        route53)
            creds_file="$DNS_CREDENTIALS_DIR/route53.ini"
            cat > "$creds_file" << EOF
# AWS credentials
[default]
aws_access_key_id = $AWS_ACCESS_KEY_ID
aws_secret_access_key = $AWS_SECRET_ACCESS_KEY
EOF
            ;;
        yandex)
            creds_file="$DNS_CREDENTIALS_DIR/yandex.ini"
            cat > "$creds_file" << EOF
# Yandex Cloud credentials
YANDEX_IAM_TOKEN=$YANDEX_IAM_TOKEN
YANDEX_FOLDER_ID=$YANDEX_FOLDER_ID
EOF
            ;;
    esac
    
    # Secure permissions
    chmod 600 "$creds_file"
    
    print_success "Credentials file created: $creds_file"
}

# =============================================================================
# OBTAIN CERTIFICATE VIA DNS API
# =============================================================================

obtain_certificate_dns() {
    print_step "Obtaining SSL certificate via DNS-01 challenge..."
    print_info "This may take 2-3 minutes for DNS propagation..."
    
    local cert_dir="/etc/letsencrypt/live/$USER_DOMAIN"
    local creds_file="$DNS_CREDENTIALS_DIR"
    
    case $DNS_PROVIDER in
        cloudflare)
            certbot certonly \
                --dns-cloudflare \
                --dns-cloudflare-credentials "$creds_file/cloudflare.ini" \
                --dns-cloudflare-propagation-seconds 60 \
                -d "$USER_DOMAIN" \
                --non-interactive \
                --agree-tos \
                --email "$USER_EMAIL" \
                || handle_certbot_error
            ;;
        digitalocean)
            certbot certonly \
                --dns-digitalocean \
                --dns-digitalocean-credentials "$creds_file/digitalocean.ini" \
                --dns-digitalocean-propagation-seconds 60 \
                -d "$USER_DOMAIN" \
                --non-interactive \
                --agree-tos \
                --email "$USER_EMAIL" \
                || handle_certbot_error
            ;;
        route53)
            certbot certonly \
                --dns-route53 \
                --dns-route53-propagation-seconds 60 \
                -d "$USER_DOMAIN" \
                --non-interactive \
                --agree-tos \
                --email "$USER_EMAIL" \
                || handle_certbot_error
            ;;
        yandex)
            print_error "Yandex Cloud DNS requires manual DNS record creation"
            print_info "Please use manual setup method instead"
            exit 1
            ;;
    esac
    
    # Copy certificates to coturn-certs
    cp "$cert_dir/fullchain.pem" "$INSTALL_DIR/coturn-certs/"
    cp "$cert_dir/privkey.pem" "$INSTALL_DIR/coturn-certs/"
    
    # Set permissions
    chmod 644 "$INSTALL_DIR/coturn-certs/fullchain.pem"
    chmod 600 "$INSTALL_DIR/coturn-certs/privkey.pem"
    
    print_success "SSL certificate obtained and copied to coturn-certs/"
}

handle_certbot_error() {
    print_error "Failed to obtain SSL certificate"
    print_info "Possible reasons:"
    print_info "  - Invalid API token"
    print_info "  - DNS not pointing to this server"
    print_info "  - Rate limit exceeded (Let's Encrypt allows 5 certs/week)"
    print_info ""
    print_info "You can try manual setup instead. See: coturn-certs/README.md"
    exit 1
}

# =============================================================================
# SETUP AUTOMATIC RENEWAL
# =============================================================================

setup_auto_renewal() {
    print_step "Setting up automatic certificate renewal..."
    
    local renewal_script="$INSTALL_DIR/renew-coturn-certs.sh"
    local creds_file="$DNS_CREDENTIALS_DIR"
    
    # Create renewal script
    cat > "$renewal_script" << EOF
#!/bin/bash
# Automatic SSL certificate renewal for CoTURN

# Renew certificate
certbot renew --quiet

# Copy to coturn-certs
cp /etc/letsencrypt/live/$USER_DOMAIN/fullchain.pem $INSTALL_DIR/coturn-certs/
cp /etc/letsencrypt/live/$USER_DOMAIN/privkey.pem $INSTALL_DIR/coturn-certs/

# Restart CoTURN
cd $INSTALL_DIR
docker compose -f docker-compose.external-proxy.yml restart coturn
EOF
    
    chmod +x "$renewal_script"
    
    # Add to crontab (runs monthly on 1st day at midnight)
    (crontab -l 2>/dev/null | grep -v "renew-coturn-certs.sh"; echo "0 0 1 * * $renewal_script") | crontab -
    
    print_success "Automatic renewal configured (runs monthly)"
}

# =============================================================================
# ASK TO DELETE CREDENTIALS
# =============================================================================

ask_delete_credentials() {
    echo ""
    echo -e "${BOLD}Security Question:${NC}"
    echo -e "${YELLOW}Your DNS API credentials are stored in: $DNS_CREDENTIALS_DIR${NC}"
    echo ""
    echo -e "These credentials are only needed for certificate renewal."
    echo -e "You can delete them now if you prefer manual renewal every 90 days."
    echo ""
    
    if ask_yes_no "Delete DNS API credentials now?" "n"; then
        rm -rf "$DNS_CREDENTIALS_DIR"
        print_success "DNS API credentials deleted"
        print_warning "You will need to manually renew certificates every 90 days"
    else
        print_info "DNS API credentials kept for automatic renewal"
    fi
}

