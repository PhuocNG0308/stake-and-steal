# Stake and Steal - Linera Testnet Deployment Script
# Make sure LLVM is installed and LIBCLANG_PATH is set before running
# $env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Stake and Steal - Linera Deployment" -ForegroundColor Cyan  
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Testnet Configuration
$FAUCET_URL = "https://faucet.testnet-conway.linera.net"
$TESTNET_NAME = "testnet-conway"

# Check Linera CLI
Write-Host "[1/6] Checking Linera CLI..." -ForegroundColor Yellow
$lineraVersion = linera --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Linera CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host '  $env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"' -ForegroundColor Gray
    Write-Host '  cargo install linera-service@0.15.10 --locked' -ForegroundColor Gray
    exit 1
}
Write-Host "  Found: $lineraVersion" -ForegroundColor Green

# Initialize wallet (already done manually)
Write-Host ""
Write-Host "[2/6] Skipping wallet initialization (already done)..." -ForegroundColor Yellow

# Show chain info
Write-Host ""
Write-Host "[3/6] Getting chain information..." -ForegroundColor Yellow
$chainInfo = linera wallet show 2>&1
Write-Host $chainInfo

# Build contract (if needed)
Write-Host ""
Write-Host "[4/6] Building smart contract..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\smart_contract"
$env:RUSTFLAGS="-C target-feature=-sign-ext,-bulk-memory"
$buildResult = cargo build --release --target wasm32-unknown-unknown 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build smart contract" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    exit 1
}
Write-Host "  Build successful!" -ForegroundColor Green

# Publish module
Write-Host ""
Write-Host "[5/6] Publishing application module..." -ForegroundColor Yellow
$contractPath = "target/wasm32-unknown-unknown/release/stake_and_steal_contract.wasm"
$servicePath = "target/wasm32-unknown-unknown/release/stake_and_steal_service.wasm"

if (-not (Test-Path $contractPath) -or -not (Test-Path $servicePath)) {
    Write-Host "ERROR: WASM files not found. Please build first." -ForegroundColor Red
    exit 1
}

$publishResultOutput = (linera publish-module $contractPath $servicePath 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to publish module" -ForegroundColor Red
    Write-Host $publishResultOutput -ForegroundColor Red
    exit 1
}

if ($publishResultOutput -match "([0-9a-f]{100,})") {
    $bytecodeId = $matches[1]
    Write-Host "  Module ID: $bytecodeId" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not parse Module ID from output" -ForegroundColor Red
    Write-Host $publishResultOutput -ForegroundColor Red
    exit 1
}

# Create application
Write-Host ""
Write-Host "[6/6] Creating application instance..." -ForegroundColor Yellow
# Initial balance of 1000 tokens
$createResultOutput = (linera create-application $bytecodeId --json-argument "1000" 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create application" -ForegroundColor Red
    Write-Host $createResultOutput -ForegroundColor Red
    exit 1
}

if ($createResultOutput -match "([0-9a-f]{100,})") {
    $applicationId = $matches[1]
    Write-Host "  Application ID: $applicationId" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not parse Application ID from output" -ForegroundColor Red
    Write-Host $createResultOutput -ForegroundColor Red
    exit 1
}

# Done!
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application ID: $applicationId" -ForegroundColor White
Write-Host ""
Write-Host "To interact with your application:" -ForegroundColor Yellow
Write-Host "  linera service --port 8080" -ForegroundColor Gray
Write-Host ""
Write-Host "Then open GraphiQL at:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080/chains/<your-chain-id>/applications/$createResult" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: Copy the Application ID and add it to your frontend/.env file:" -ForegroundColor Yellow
Write-Host "  VITE_APP_ID=$createResult" -ForegroundColor Gray
Write-Host ""
