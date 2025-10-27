#!/usr/bin/env bash

# =============================================================================
# ERROR HANDLING AND RECOVERY
# =============================================================================
# This module provides robust error handling, retry logic, and graceful
# degradation for the installer
# =============================================================================

# Global error tracking
LAST_ERROR_COMMAND=""
LAST_ERROR_LINE=""
LAST_ERROR_CODE=""

# =============================================================================
# ERROR TRAP
# =============================================================================

# Setup error trap
setup_error_trap() {
    trap 'handle_error $? $LINENO "$BASH_COMMAND"' ERR
    trap 'handle_exit' EXIT
}

# Handle errors
handle_error() {
    local exit_code=$1
    local line_number=$2
    local command=$3
    
    LAST_ERROR_CODE=$exit_code
    LAST_ERROR_LINE=$line_number
    LAST_ERROR_COMMAND=$command
    
    # Don't print error if it's already handled
    if [ "$ERROR_HANDLED" = "true" ]; then
        ERROR_HANDLED=""
        return 0
    fi
    
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}${BOLD}  ❌ INSTALLATION FAILED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}Error Details:${NC}"
    echo -e "  Command: ${CYAN}$command${NC}"
    echo -e "  Exit Code: ${RED}$exit_code${NC}"
    echo -e "  Line: $line_number"
    echo ""
    
    # Provide context-specific help
    provide_error_help "$command" "$exit_code"
    
    echo ""
    echo -e "${BOLD}What to do next:${NC}"
    echo ""
    echo -e "1. ${CYAN}Check the error message above${NC}"
    echo -e "2. ${CYAN}Fix the issue (see suggestions)${NC}"
    echo -e "3. ${CYAN}Run the installer again:${NC}"
    echo "   curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash"
    echo ""
    echo -e "${BOLD}Need help?${NC}"
    echo "  📖 Documentation: https://github.com/geladons/svazapp/blob/main/DEPLOYMENT.md"
    echo "  🐛 Report issue: https://github.com/geladons/svazapp/issues"
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Handle exit
handle_exit() {
    local exit_code=$?
    
    # If exit code is 0, installation was successful
    if [ $exit_code -eq 0 ]; then
        return 0
    fi
    
    # If error was already handled, don't print again
    if [ -n "$LAST_ERROR_COMMAND" ]; then
        return 0
    fi
    
    # Unknown error
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}${BOLD}  ❌ INSTALLATION INTERRUPTED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}The installation was interrupted unexpectedly.${NC}"
    echo ""
    echo -e "${BOLD}To retry:${NC}"
    echo "  curl -fsSL https://raw.githubusercontent.com/geladons/svazapp/main/install.sh | bash"
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Provide context-specific error help
provide_error_help() {
    local command=$1
    local exit_code=$2
    
    # apt-get update errors
    if [[ "$command" == *"apt-get update"* ]]; then
        echo -e "${BOLD}Possible causes:${NC}"
        echo -e "  ${YELLOW}•${NC} Ubuntu mirror sync in progress (temporary)"
        echo -e "  ${YELLOW}•${NC} Network connectivity issues"
        echo -e "  ${YELLOW}•${NC} DNS resolution problems"
        echo ""
        echo -e "${BOLD}Suggested fixes:${NC}"
        echo -e "  ${GREEN}•${NC} Wait 5-10 minutes and try again"
        echo -e "  ${GREEN}•${NC} Check internet connection: ${CYAN}ping -c 3 google.com${NC}"
        echo -e "  ${GREEN}•${NC} Try different Ubuntu mirror: ${CYAN}sudo sed -i 's|archive.ubuntu.com|mirror.yandex.ru/ubuntu|g' /etc/apt/sources.list${NC}"
        echo -e "  ${GREEN}•${NC} Clear apt cache: ${CYAN}sudo apt-get clean && sudo rm -rf /var/lib/apt/lists/*${NC}"
        return 0
    fi
    
    # Docker installation errors
    if [[ "$command" == *"docker"* ]]; then
        echo -e "${BOLD}Possible causes:${NC}"
        echo -e "  ${YELLOW}•${NC} Docker repository not accessible"
        echo -e "  ${YELLOW}•${NC} Conflicting Docker installation"
        echo -e "  ${YELLOW}•${NC} Insufficient permissions"
        echo ""
        echo -e "${BOLD}Suggested fixes:${NC}"
        echo -e "  ${GREEN}•${NC} Remove old Docker: ${CYAN}sudo apt-get remove docker docker-engine docker.io containerd runc${NC}"
        echo -e "  ${GREEN}•${NC} Check Docker repo: ${CYAN}curl -fsSL https://download.docker.com/linux/ubuntu/gpg${NC}"
        return 0
    fi
    
    # Git clone errors
    if [[ "$command" == *"git clone"* ]]; then
        echo -e "${BOLD}Possible causes:${NC}"
        echo -e "  ${YELLOW}•${NC} GitHub not accessible"
        echo -e "  ${YELLOW}•${NC} Directory already exists"
        echo -e "  ${YELLOW}•${NC} Insufficient disk space"
        echo ""
        echo -e "${BOLD}Suggested fixes:${NC}"
        echo -e "  ${GREEN}•${NC} Check GitHub access: ${CYAN}curl -I https://github.com${NC}"
        echo -e "  ${GREEN}•${NC} Remove old directory: ${CYAN}sudo rm -rf /opt/svazapp${NC}"
        echo -e "  ${GREEN}•${NC} Check disk space: ${CYAN}df -h${NC}"
        return 0
    fi

    # Certbot errors
    if [[ "$command" == *"certbot"* ]]; then
        echo -e "${BOLD}Possible causes:${NC}"
        echo -e "  ${YELLOW}•${NC} Invalid DNS API token"
        echo -e "  ${YELLOW}•${NC} DNS not pointing to this server"
        echo -e "  ${YELLOW}•${NC} Rate limit exceeded (5 certs/week per domain)"
        echo -e "  ${YELLOW}•${NC} DNS propagation timeout"
        echo ""
        echo -e "${BOLD}Suggested fixes:${NC}"
        echo -e "  ${GREEN}•${NC} Verify API token is correct"
        echo -e "  ${GREEN}•${NC} Check DNS: ${CYAN}dig $USER_DOMAIN${NC}"
        echo -e "  ${GREEN}•${NC} Wait 1 hour and try again (rate limit)"
        echo -e "  ${GREEN}•${NC} Use manual setup: see coturn-certs/README.md"
        return 0
    fi

    # Crontab errors
    if [[ "$command" == *"crontab"* ]]; then
        echo -e "${BOLD}Possible causes:${NC}"
        echo -e "  ${YELLOW}•${NC} Cron service not running"
        echo -e "  ${YELLOW}•${NC} Permission issues"
        echo ""
        echo -e "${BOLD}Suggested fixes:${NC}"
        echo -e "  ${GREEN}•${NC} Check cron service: ${CYAN}systemctl status cron${NC}"
        echo -e "  ${GREEN}•${NC} Start cron: ${CYAN}systemctl start cron${NC}"
        return 0
    fi

    # Generic error
    echo -e "${BOLD}Suggested fixes:${NC}"
    echo -e "  ${GREEN}•${NC} Check the error message above for details"
    echo -e "  ${GREEN}•${NC} Ensure you have root/sudo privileges"
    echo -e "  ${GREEN}•${NC} Check system logs: ${CYAN}sudo journalctl -xe${NC}"
}

# =============================================================================
# RETRY LOGIC
# =============================================================================

# Retry command with exponential backoff
retry_command() {
    local max_attempts=${1:-3}
    local delay=${2:-5}
    local command="${@:3}"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if [ $attempt -gt 1 ]; then
            print_warning "Retry attempt $attempt/$max_attempts (waiting ${delay}s)..."
            sleep $delay
            delay=$((delay * 2))  # Exponential backoff
        fi
        
        # Run command and capture exit code
        if eval "$command"; then
            return 0
        fi
        
        attempt=$((attempt + 1))
    done
    
    # All attempts failed
    return 1
}

# =============================================================================
# APT-GET UPDATE WITH RETRY
# =============================================================================

# Safe apt-get update with retry and fallback
safe_apt_update() {
    local max_attempts=3
    local attempt=1
    
    print_step "Updating package lists..."
    
    while [ $attempt -le $max_attempts ]; do
        if [ $attempt -gt 1 ]; then
            print_warning "Retry attempt $attempt/$max_attempts (waiting 10s for mirror sync)..."
            sleep 10
        fi
        
        # Try normal update
        if sudo apt-get update 2>&1 | tee /tmp/apt-update.log; then
            print_success "Package lists updated"
            rm -f /tmp/apt-update.log
            ERROR_HANDLED="true"
            return 0
        fi
        
        # Check if it's a mirror sync issue
        if grep -q "Mirror sync in progress" /tmp/apt-update.log; then
            print_warning "Ubuntu mirrors are syncing (temporary issue)"
            attempt=$((attempt + 1))
            continue
        fi
        
        # Check if it's a hash mismatch
        if grep -q "Hash Sum mismatch\|File has unexpected size" /tmp/apt-update.log; then
            print_warning "Mirror sync issue detected"
            attempt=$((attempt + 1))
            continue
        fi
        
        # Other error - break
        break
    done
    
    # All attempts failed - try fallback
    print_warning "Standard apt-get update failed after $max_attempts attempts"
    print_info "Trying fallback: clearing cache and using different mirror..."
    
    # Clear apt cache
    sudo apt-get clean
    sudo rm -rf /var/lib/apt/lists/*
    
    # Try one more time
    if sudo apt-get update -o Acquire::AllowInsecureRepositories=true 2>&1; then
        print_success "Package lists updated (using fallback method)"
        ERROR_HANDLED="true"
        return 0
    fi
    
    # Complete failure
    print_error "Failed to update package lists"
    print_info "This is usually a temporary issue with Ubuntu mirrors"
    print_info "Please wait 10-15 minutes and try again"
    rm -f /tmp/apt-update.log
    ERROR_HANDLED="true"
    return 1
}

