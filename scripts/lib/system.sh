#!/usr/bin/env bash

# =============================================================================
# SYSTEM DETECTION AND REQUIREMENTS
# =============================================================================

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    elif [ "$(uname)" = "Darwin" ]; then
        OS="macos"
    else
        OS="unknown"
    fi
    
    print_info "Detected OS: $OS $OS_VERSION"
}

# Check system requirements
check_requirements() {
    print_step "Checking system requirements..."
    
    # Check RAM
    local total_ram=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 2000 ]; then
        print_warning "Low RAM detected: ${total_ram}MB (minimum 2GB recommended)"
        if ! ask_yes_no "Continue anyway?"; then
            exit 1
        fi
    else
        print_success "RAM: ${total_ram}MB"
    fi
    
    # Check disk space
    local free_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$free_space" -lt 20 ]; then
        print_warning "Low disk space: ${free_space}GB (minimum 20GB recommended)"
        if ! ask_yes_no "Continue anyway?"; then
            exit 1
        fi
    else
        print_success "Disk space: ${free_space}GB available"
    fi
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    print_success "CPU cores: $cpu_cores"
}

