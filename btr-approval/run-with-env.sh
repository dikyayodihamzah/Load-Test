#!/bin/bash

# k6 Load Test with .env file support
# This script loads .env file and runs k6 with proper environment variables

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to load .env file
load_env_file() {
    local env_file="${1:-.env}"
    
    if [[ ! -f "$env_file" ]]; then
        print_error ".env file not found: $env_file"
        echo "Please create .env file first:"
        echo "  cp env.example .env"
        echo "  # Edit .env with your actual tokens"
        exit 1
    fi
    
    print_info "Loading environment variables from $env_file..."
    
    # Load .env file, ignore comments and empty lines
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
            continue
        fi
        
        # Export the variable
        if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            local var_name="${BASH_REMATCH[1]// /}"
            local var_value="${BASH_REMATCH[2]}"
            
            # Remove quotes if present
            var_value="${var_value%\"}"
            var_value="${var_value#\"}"
            var_value="${var_value%\'}"
            var_value="${var_value#\'}"
            
            export "$var_name"="$var_value"
            print_success "Loaded: $var_name=${var_value:0:20}..."
        fi
    done < "$env_file"
}

# Function to check required variables
check_required_vars() {
    local required_vars=("TOKEN_ESS" "REFRESH_TOKEN" "BASE_URL")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        echo "Please set them in your .env file"
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Function to show usage
show_usage() {
    echo "k6 Load Test Runner with .env support"
    echo ""
    echo "Usage: $0 [script] [load_profile] [env_file]"
    echo ""
    echo "Arguments:"
    echo "  script        - Test script (default: btr-approval-load-test.js)"
    echo "  load_profile  - Load profile: light, medium, heavy, spike (default: medium)"
    echo "  env_file      - Environment file (default: .env)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run BTR test with medium load"
    echo "  $0 btr-approval-load-test.js heavy    # Run BTR test with heavy load"
    echo "  $0 btr-approval-load-test.js light .env.staging  # Use staging env file"
}

# Main function
main() {
    echo "🚀 k6 Load Test Runner with .env Support"
    echo "========================================"
    
    # Parse arguments
    local script="${1:-btr-approval-load-test.js}"
    local load_profile="${2:-medium}"
    local env_file="${3:-.env}"
    
    # Show help if requested
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_usage
        exit 0
    fi
    
    # Check if script exists
    if [[ ! -f "$script" ]]; then
        print_error "Script file not found: $script"
        exit 1
    fi
    
    # Load environment file
    load_env_file "$env_file"
    
    # Check required variables
    check_required_vars
    
    # Show configuration
    echo ""
    print_info "Test Configuration:"
    echo "  📄 Script: $script"
    echo "  🎯 Load Profile: $load_profile"
    echo "  🌐 Base URL: $BASE_URL"
    echo "  🔐 TOKEN_ESS: ${TOKEN_ESS:0:20}..."
    echo "  🔄 REFRESH_TOKEN: ${REFRESH_TOKEN:0:20}..."
    if [[ -n "$TOKEN_QHSE" ]]; then
        echo "  🛡️  TOKEN_QHSE: ${TOKEN_QHSE:0:20}..."
    fi
    echo ""
    
    # Run k6 with environment variables
    print_info "Starting k6 load test..."
    echo ""
    
    k6 run \
        -e TOKEN_ESS="$TOKEN_ESS" \
        -e REFRESH_TOKEN="$REFRESH_TOKEN" \
        -e TOKEN_QHSE="$TOKEN_QHSE" \
        -e BASE_URL="$BASE_URL" \
        -e LOAD_PROFILE="$load_profile" \
        -e HTTP_REQ_DURATION_P95="${HTTP_REQ_DURATION_P95:-500}" \
        -e HTTP_REQ_FAILED_RATE="${HTTP_REQ_FAILED_RATE:-0.05}" \
        -e MIN_SLEEP_TIME="${MIN_SLEEP_TIME:-1}" \
        -e MAX_SLEEP_TIME="${MAX_SLEEP_TIME:-3}" \
        -e ENABLE_DETAILED_LOGS="${ENABLE_DETAILED_LOGS:-false}" \
        "$script"
    
    local exit_code=$?
    
    echo ""
    if [[ $exit_code -eq 0 ]]; then
        print_success "Load test completed successfully!"
    else
        print_error "Load test failed with exit code: $exit_code"
    fi
    
    exit $exit_code
}

# Run main function with all arguments
main "$@"
