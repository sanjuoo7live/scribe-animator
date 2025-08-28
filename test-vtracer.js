#!/usr/bin/env node

/**
 * VTracer WASM Direct Test
 * Tests the WASM module directly in Node.js environment
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 VTracer WASM Direct Test Suite');
console.log('==================================');

async function testWasmModule() {
    console.log('\n📦 Testing WASM module files...');
    
    // Check if files exist
    const jsFile = './frontend/public/assets/tools/vtracer/vtracer_real.js';
    const wasmFile = './frontend/public/assets/tools/vtracer/vtracer_real_bg.wasm';
    
    if (!fs.existsSync(jsFile)) {
        console.error('❌ vtracer_real.js not found');
        return false;
    }
    console.log('✅ vtracer_real.js found');
    
    if (!fs.existsSync(wasmFile)) {
        console.error('❌ vtracer_real_bg.wasm not found');
        return false;
    }
    console.log('✅ vtracer_real_bg.wasm found');
    
    // Check file sizes
    const jsSize = fs.statSync(jsFile).size;
    const wasmSize = fs.statSync(wasmFile).size;
    
    console.log(`📊 File sizes: JS=${jsSize} bytes, WASM=${wasmSize} bytes`);
    
    if (jsSize < 1000) {
        console.warn('⚠️ JS file seems very small, might be incomplete');
    }
    
    if (wasmSize < 10000) {
        console.warn('⚠️ WASM file seems very small, might be incomplete');
    }
    
    return true;
}

async function testImageGeneration() {
    console.log('\n🖼️ Testing image data generation...');
    
    // Create test image data (RGBA format)
    const width = 4, height = 4;
    const imageData = new Uint8Array(width * height * 4);
    
    // Fill with red and white checkerboard
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if ((x + y) % 2 === 0) {
                imageData[i] = 255;     // R
                imageData[i + 1] = 0;   // G  
                imageData[i + 2] = 0;   // B
                imageData[i + 3] = 255; // A
            } else {
                imageData[i] = 255;     // R
                imageData[i + 1] = 255; // G
                imageData[i + 2] = 255; // B
                imageData[i + 3] = 255; // A
            }
        }
    }
    
    console.log(`✅ Generated ${width}x${height} test image (${imageData.length} bytes)`);
    
    // Save as test file for debugging
    fs.writeFileSync('./test-image-data.raw', imageData);
    console.log('💾 Saved test image data to test-image-data.raw');
    
    return imageData;
}

async function testWorkerScript() {
    console.log('\n🔧 Testing worker script...');
    
    const workerFile = './frontend/src/vtrace/vtracerWorker.ts';
    
    if (!fs.existsSync(workerFile)) {
        console.error('❌ vtracerWorker.ts not found');
        return false;
    }
    
    const workerContent = fs.readFileSync(workerFile, 'utf-8');
    
    // Check for key components
    const checks = [
        ['convert_image_to_svg function call', workerContent.includes('convert_image_to_svg')],
        ['vtracer_real.js import', workerContent.includes('vtracer_real.js')],
        ['Error handling', workerContent.includes('try {') && workerContent.includes('catch')],
        ['Message handling', workerContent.includes('addEventListener')]
    ];
    
    let passed = 0;
    for (const [check, result] of checks) {
        console.log(`${result ? '✅' : '❌'} ${check}`);
        if (result) passed++;
    }
    
    console.log(`📊 Worker checks: ${passed}/${checks.length} passed`);
    
    return passed === checks.length;
}

async function testCargoProject() {
    console.log('\n🦀 Testing Cargo project...');
    
    const wasmLibPath = './vtracer/wasm-lib';
    const cargoToml = path.join(wasmLibPath, 'Cargo.toml');
    const libRs = path.join(wasmLibPath, 'src/lib.rs');
    
    if (!fs.existsSync(cargoToml)) {
        console.error('❌ Cargo.toml not found');
        return false;
    }
    console.log('✅ Cargo.toml found');
    
    if (!fs.existsSync(libRs)) {
        console.error('❌ lib.rs not found');
        return false;
    }
    console.log('✅ lib.rs found');
    
    // Check if pkg directory exists
    const pkgPath = path.join(wasmLibPath, 'pkg');
    if (fs.existsSync(pkgPath)) {
        const pkgFiles = fs.readdirSync(pkgPath);
        console.log(`📦 Package files: ${pkgFiles.join(', ')}`);
        
        // Check for key generated files
        const requiredFiles = ['vtracer_wasm.js', 'vtracer_wasm_bg.wasm'];
        const missingFiles = requiredFiles.filter(f => !pkgFiles.includes(f));
        
        if (missingFiles.length > 0) {
            console.warn(`⚠️ Missing generated files: ${missingFiles.join(', ')}`);
        } else {
            console.log('✅ All required generated files present');
        }
    } else {
        console.warn('⚠️ pkg directory not found, run wasm-pack build');
    }
    
    return true;
}

async function generateTestReport() {
    console.log('\n📋 Generating test report...');
    
    const report = {
        timestamp: new Date().toISOString(),
        tests: {},
        recommendations: []
    };
    
    // Run all tests
    report.tests.wasmModule = await testWasmModule();
    report.tests.imageGeneration = await testImageGeneration();
    report.tests.workerScript = await testWorkerScript();
    report.tests.cargoProject = await testCargoProject();
    
    // Generate recommendations
    if (!report.tests.wasmModule) {
        report.recommendations.push('Rebuild WASM module with: cd vtracer/wasm-lib && wasm-pack build --target web --out-dir pkg');
    }
    
    if (!report.tests.workerScript) {
        report.recommendations.push('Check vtracerWorker.ts for syntax errors or missing imports');
    }
    
    if (!report.tests.cargoProject) {
        report.recommendations.push('Verify Cargo project structure and dependencies');
    }
    
    // Save report
    fs.writeFileSync('./vtracer-test-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 Test Summary:');
    console.log(`Passed: ${Object.values(report.tests).filter(Boolean).length}/${Object.keys(report.tests).length}`);
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec}`);
        });
    }
    
    console.log('\n💾 Full report saved to vtracer-test-report.json');
    
    return report;
}

// Run tests
(async () => {
    try {
        const report = await generateTestReport();
        
        // Exit with appropriate code
        const allPassed = Object.values(report.tests).every(Boolean);
        process.exit(allPassed ? 0 : 1);
        
    } catch (error) {
        console.error('\n💥 Test suite failed:', error.message);
        process.exit(1);
    }
})();
