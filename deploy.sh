#!/bin/bash

# Deploy script for Christian Recovery App
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running
check_service() {
    local service=$1
    local host=$2
    local port=$3
    
    if command_exists nc; then
        if nc -z "$host" "$port" 2>/dev/null; then
            print_status "$service is running on $host:$port"
            return 0
        else
            print_error "$service is not accessible on $host:$port"
            return 1
        fi
    else
        print_warning "netcat not available, skipping $service check"
        return 0
    fi
}

# Check environment variables
check_environment() {
    print_info "Checking environment variables..."
    
    # Source the .env file if it exists
    if [ -f ".env" ]; then
        print_info "Loading environment variables from .env file..."
        
        # Load .env file safely, ignoring comments and empty lines
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            if [[ $key != \#* ]] && [ ! -z "$key" ]; then
                # Remove any leading/trailing whitespace and quotes
                key=$(echo "$key" | xargs)
                value=$(echo "$value" | xargs)
                
                # Remove quotes if they exist
                value="${value%\"}"
                value="${value#\"}"
                value="${value%\'}"
                value="${value#\'}"
                
                # Export the variable
                export "$key"="$value"
            fi
        done < .env
        
        print_status ".env file loaded successfully"
    else
        print_warning ".env file not found, assuming environment variables are already set"
    fi
    
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "DB_USER"
        "REDIS_HOST"
        "REDIS_PORT"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
    
    print_status "All required environment variables are set"
}

# Check Node.js and npm
check_node() {
    print_info "Checking Node.js installation..."
    
    if command_exists node; then
        print_status "Node.js is installed ($(node --version))"
    else
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if command_exists npm; then
        print_status "npm is installed ($(npm --version))"
    else
        print_error "npm is not installed"
        exit 1
    fi
}

# Check PM2
check_pm2() {
    print_info "Checking PM2 installation..."
    
    if command_exists pm2; then
        print_status "PM2 is installed ($(pm2 --version))"
    else
        print_error "PM2 is not installed. Installing..."
        npm install -g pm2
        pm2 startup
        print_status "PM2 installed successfully"
    fi
}

# Check database connection
check_database() {
    print_info "Checking database connection..."
    check_service "MySQL/MariaDB" "$DB_HOST" "$DB_PORT"
}

# Check Redis connection
check_redis() {
    print_info "Checking Redis connection..."
    check_service "Redis" "$REDIS_HOST" "$REDIS_PORT"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    if [ -f "package.json" ]; then
        npm install --production
        print_status "Dependencies installed successfully"
    else
        print_error "package.json not found"
        exit 1
    fi
}

# Check if ecosystem.config.js exists
check_ecosystem_config() {
    print_info "Checking PM2 ecosystem configuration..."
    
    if [ -f "ecosystem.config.js" ]; then
        print_status "ecosystem.config.js found"
    else
        print_error "ecosystem.config.js not found"
        exit 1
    fi
}

# Manage PM2 process
manage_pm2_process() {
    local app_name="christian-recovery-app"
    
    print_info "Managing PM2 process..."
    
    if pm2 list | grep -q "$app_name"; then
        print_info "Reloading existing PM2 process..."
        pm2 reload "$app_name"
        print_status "PM2 process reloaded"
    else
        print_info "Starting new PM2 process..."
        pm2 start ecosystem.config.js --env production
        print_status "PM2 process started"
    fi
    
    # Save PM2 process list
    pm2 save
    print_status "PM2 process list saved"
}

# Show PM2 status
show_pm2_status() {
    print_info "Current PM2 processes:"
    pm2 list
    
    print_info "PM2 logs (last 10 lines):"
    pm2 logs --lines 10
}

# Main deployment function
main() {
    print_info "Starting deployment process..."
    
    # Change to deployment directory if provided
    if [ -n "$1" ]; then
        cd "$1"
        print_info "Changed to deployment directory: $1"
    fi
    
    # Run all checks and deployment steps
    check_environment
    check_node
    check_pm2
    check_database
    check_redis
    check_ecosystem_config
    install_dependencies
    manage_pm2_process
    show_pm2_status
    
    print_status "Deployment completed successfully!"
}

# Run main function with all arguments
main "$@"
