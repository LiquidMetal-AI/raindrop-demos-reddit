#!/bin/bash

# Dream Machine API Test Script
# This script tests all endpoints of the Dream Machine API

API_URL="https://dream-machine-api.01jtgshcvx4ms1zqv3x8vcdmxg.lmapp.run"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper functions
log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

# Test API endpoint with curl
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local test_name=$5
    
    log_test "$test_name"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint")
    fi
    
    # Extract status code and body
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        log_success "Status: $status_code (expected $expected_status)"
        echo "Response: $body" | head -c 200
        echo ""
        return 0
    else
        log_error "Status: $status_code (expected $expected_status)"
        echo "Response: $body"
        return 1
    fi
}

echo "=========================================="
echo "Dream Machine API Test Suite"
echo "API URL: $API_URL"
echo "=========================================="
echo ""

# Test 1: Seed database first
echo "1. SETUP - Seeding database with sample data"
test_endpoint "POST" "/api/debug/seed" "" 200 "Seed database"
echo ""

# Test 2: Submit a new dream
echo "2. CORE FUNCTIONALITY - Dream Submission"
dream_data='{"content": "I was walking through a forest of mirrors, each reflection showing a different version of myself living alternate lives.", "title": "Mirror Forest", "theme": "identity"}'
submit_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$dream_data" \
    "$API_URL/api/dreams")

if echo "$submit_response" | grep -q '"id"'; then
    DREAM_ID=$(echo "$submit_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_success "Dream submitted successfully with ID: $DREAM_ID"
    echo "Response: $submit_response" | head -c 200
    echo ""
else
    log_error "Failed to submit dream"
    echo "Response: $submit_response"
    DREAM_ID=""
fi
echo ""

# Test 3: Get all dreams
echo "3. RETRIEVAL - Get all dreams"
test_endpoint "GET" "/api/dreams" "" 200 "Get all dreams"
echo ""

# Test 4: Get dreams with pagination
echo "4. PAGINATION - Get dreams with limit and offset"
test_endpoint "GET" "/api/dreams?limit=2&offset=0" "" 200 "Get dreams with pagination"
echo ""

# Test 5: Get dream details (if we have a dream ID)
if [ -n "$DREAM_ID" ]; then
    echo "5. DETAIL RETRIEVAL - Get specific dream details"
    test_endpoint "GET" "/api/dreams/$DREAM_ID" "" 200 "Get dream details for ID: $DREAM_ID"
    echo ""
    
    # Test 6: Get similar dreams
    echo "6. SIMILARITY SEARCH - Get similar dreams"
    test_endpoint "GET" "/api/dreams/$DREAM_ID/similar" "" 200 "Get similar dreams for ID: $DREAM_ID"
    echo ""
    
    # Test 7: Continue dream (forward)
    echo "7. CONTINUATION - Continue dream forward"
    continue_data='{"direction": "forward"}'
    test_endpoint "POST" "/api/dreams/$DREAM_ID/continue" "$continue_data" 200 "Continue dream forward"
    echo ""
    
    # Test 8: Continue dream (backward)
    echo "8. CONTINUATION - Continue dream backward"
    continue_data='{"direction": "backward"}'
    test_endpoint "POST" "/api/dreams/$DREAM_ID/continue" "$continue_data" 200 "Continue dream backward"
    echo ""
    
    # Test 9: Continue dream (alternate)
    echo "9. CONTINUATION - Continue dream alternate"
    continue_data='{"direction": "alternate"}'
    test_endpoint "POST" "/api/dreams/$DREAM_ID/continue" "$continue_data" 200 "Continue dream alternate"
    echo ""
else
    echo "5-9. SKIPPING dream-specific tests (no valid dream ID)"
    echo ""
fi

# Test 10: Get constellation
echo "10. CONSTELLATION - Get dream constellation"
test_endpoint "GET" "/api/constellation" "" 200 "Get dream constellation"
echo ""

# Test 11: Get constellation with query
echo "11. CONSTELLATION QUERY - Get constellation with specific query"
test_endpoint "GET" "/api/constellation?query=freedom&limit=5" "" 200 "Get constellation with query"
echo ""

# Test 12: Error handling - Invalid dream ID
echo "12. ERROR HANDLING - Test invalid dream ID"
test_endpoint "GET" "/api/dreams/invalid-id" "" 404 "Get dream with invalid ID"
echo ""

# Test 13: Error handling - Missing content in dream submission
echo "13. ERROR HANDLING - Test dream submission without content"
invalid_dream='{"title": "Empty Dream"}'
test_endpoint "POST" "/api/dreams" "$invalid_dream" 400 "Submit dream without content"
echo ""

# Test 14: CORS preflight
echo "14. CORS - Test preflight request"
log_test "CORS preflight request"
cors_response=$(curl -s -w "\n%{http_code}" -X OPTIONS \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$API_URL/api/dreams")

cors_status=$(echo "$cors_response" | tail -n1)
if [ "$cors_status" -eq 204 ]; then
    log_success "CORS preflight successful: $cors_status"
else
    log_error "CORS preflight failed: $cors_status"
fi
echo ""

# Test 15: Invalid endpoint
echo "15. ERROR HANDLING - Test invalid endpoint"
test_endpoint "GET" "/api/invalid" "" 404 "Access invalid endpoint"
echo ""

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the API implementation.${NC}"
    exit 1
fi