#!/usr/bin/env bash

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

# Validate domain name
validate_domain() {
    local domain="$1"
    if [[ ! "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# Validate email
validate_email() {
    local email="$1"
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# Generate random secret
generate_secret() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Check if domain DNS points to this server
check_dns_configuration() {
    local domain="$1"
    local scenario="$2"

    # Only check for standalone scenario (Caddy needs DNS for SSL)
    if [ "$scenario" != "standalone" ]; then
        return 0
    fi

    print_step "Checking DNS configuration for $domain..."

    # Get server's public IP
    local server_ip=$(curl -s -4 --max-time 5 https://api.ipify.org 2>/dev/null || \
                      curl -s -4 --max-time 5 https://ifconfig.me 2>/dev/null || \
                      echo "")

    if [ -z "$server_ip" ]; then
        print_warning "Could not detect server's public IP"
        print_info "Skipping DNS check"
        return 0
    fi

    print_info "Server public IP: $server_ip"

    # Resolve domain to IP (try multiple methods)
    local domain_ip=""

    if command -v dig &> /dev/null; then
        domain_ip=$(dig +short "$domain" A 2>/dev/null | head -n1)
    elif command -v nslookup &> /dev/null; then
        domain_ip=$(nslookup "$domain" 2>/dev/null | awk '/^Address: / { print $2 }' | head -n1)
    elif command -v host &> /dev/null; then
        domain_ip=$(host "$domain" 2>/dev/null | awk '/has address/ { print $4 }' | head -n1)
    fi

    if [ -z "$domain_ip" ]; then
        print_warning "Could not resolve $domain to an IP address"
        echo ""
        echo -e "${YELLOW}⚠${NC}  ${BOLD}DNS is not configured correctly!${NC}"
        echo ""
        echo "   For Caddy to obtain SSL certificates, DNS must be configured:"
        echo "   1. Create an A record for: $domain"
        echo "   2. Point it to: $server_ip"
        echo "   3. Wait for DNS propagation (5-30 minutes)"
        echo ""

        if ! ask_yes_no "Continue anyway? (SSL will fail without correct DNS)" "n"; then
            print_error "Installation cancelled"
            exit 1
        fi
        return 0
    fi

    print_info "Domain resolves to: $domain_ip"

    # Compare IPs
    if [ "$server_ip" = "$domain_ip" ]; then
        print_success "DNS is configured correctly! ✓"
        echo ""
        return 0
    else
        print_warning "DNS mismatch detected!"
        echo ""
        echo -e "${YELLOW}⚠${NC}  ${BOLD}DNS is pointing to a different IP!${NC}"
        echo ""
        echo "   Expected: $server_ip (this server)"
        echo "   Actual:   $domain_ip (from DNS)"
        echo ""
        echo "   Caddy will NOT be able to obtain SSL certificates until DNS is fixed."
        echo ""

        if ! ask_yes_no "Continue anyway? (You can fix DNS later)" "n"; then
            print_error "Installation cancelled"
            exit 1
        fi
        return 0
    fi
}

