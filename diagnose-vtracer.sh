#!/bin/bash

# VTracer WASM Diagnostic Script
# This script runs comprehensive tests on the VTracer WASM integration

echo "🧪 VTracer WASM Diagnostic Suite"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "🔍 $test_name... "
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

run_test_with_output() {
    local test_name="$1"
    local test_command="$2"
    
    echo "🔍 $test_name"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if result=$(eval "$test_command" 2>&1); then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "$result" | grep -E "(✅|📊|Found|Generated)" || echo "$result"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "$result"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    echo ""
}

echo "📦 File System Tests"
echo "===================="

run_test "VTracer WASM JS file exists" "test -f './frontend/public/assets/tools/vtracer/vtracer_real.js'"
run_test "VTracer WASM binary exists" "test -f './frontend/public/assets/tools/vtracer/vtracer_real_bg.wasm'"
run_test "VTracer worker exists" "test -f './frontend/src/vtrace/vtracerWorker.ts'"
run_test "SvgImporter component exists" "test -f './frontend/src/components/SvgImporter.tsx'"

echo ""
echo "📏 File Size Tests"
echo "=================="

JS_SIZE=$(stat -f%z './frontend/public/assets/tools/vtracer/vtracer_real.js' 2>/dev/null || echo "0")
WASM_SIZE=$(stat -f%z './frontend/public/assets/tools/vtracer/vtracer_real_bg.wasm' 2>/dev/null || echo "0")

run_test "JS file size reasonable (>5KB)" "test $JS_SIZE -gt 5000"
run_test "WASM file size reasonable (>50KB)" "test $WASM_SIZE -gt 50000"

echo -e "${BLUE}📊 JS file: ${JS_SIZE} bytes, WASM file: ${WASM_SIZE} bytes${NC}"
echo ""

echo "🔧 Build System Tests"
echo "====================="

run_test "Cargo project exists" "test -f './vtracer/wasm-lib/Cargo.toml'"
run_test "Rust source exists" "test -f './vtracer/wasm-lib/src/lib.rs'"
run_test "Generated pkg exists" "test -d './vtracer/wasm-lib/pkg'"

echo ""
echo "📄 Code Quality Tests"
echo "====================="

run_test "Worker has error handling" "grep -q 'try {' './frontend/src/vtrace/vtracerWorker.ts'"
run_test "Worker has WASM import" "grep -q 'vtracer_real.js' './frontend/src/vtrace/vtracerWorker.ts'"
run_test "SvgImporter has VTracer options" "grep -q 'mode.*spline' './frontend/src/components/SvgImporter.tsx'"

echo ""
echo "🚀 Runtime Tests"
echo "================"

run_test_with_output "Node.js diagnostics" "node test-vtracer.js"

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "${BLUE}Total tests: $TESTS_TOTAL${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! VTracer WASM is ready.${NC}"
    echo ""
    echo "🌐 Next steps:"
    echo "1. Open http://localhost:3002 in your browser"
    echo "2. Navigate to SVG Importer"
    echo "3. Test with the bear image or any other image"
    echo "4. If issues persist, check browser console for detailed error messages"
    echo ""
    echo "📋 Test pages available:"
    echo "- Comprehensive: file://$(pwd)/vtracer-test.html"
    echo "- Minimal: file://$(pwd)/vtracer-minimal-test.html"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please address the issues above.${NC}"
    echo ""
    echo "💡 Common fixes:"
    echo "1. Rebuild WASM: cd vtracer/wasm-lib && wasm-pack build --target web --out-dir pkg"
    echo "2. Copy files: cp vtracer/wasm-lib/pkg/vtracer_wasm* frontend/public/assets/tools/vtracer/"
    echo "3. Check file permissions and paths"
    exit 1
fi
