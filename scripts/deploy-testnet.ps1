# Stake and Steal - Linera Testnet Deployment Script
# Make sure LLVM is installed and LIBCLANG_PATH is set before running
# $env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
#
# IMPORTANT: MUST use Rust 1.86.0 for building! (Rust 1.87+ produces incompatible WASM)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Stake and Steal - Linera Deployment" -ForegroundColor Cyan  
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Testnet Configuration
$FAUCET_URL = "https://faucet.testnet-conway.linera.net"
$TESTNET_NAME = "testnet-conway"
$RUST_VERSION = "1.86.0"

# Check Linera CLI
Write-Host "[1/7] Checking Linera CLI..." -ForegroundColor Yellow
$lineraVersion = linera --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Linera CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host '  $env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"' -ForegroundColor Gray
    Write-Host '  cargo install linera-service@0.15.10 --locked' -ForegroundColor Gray
    exit 1
}
Write-Host "  Found: $lineraVersion" -ForegroundColor Green

# Check Rust 1.86.0
Write-Host ""
Write-Host "[2/7] Checking Rust $RUST_VERSION toolchain..." -ForegroundColor Yellow
$rustVersion = rustup run $RUST_VERSION rustc --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Rust $RUST_VERSION not found. Installing..." -ForegroundColor Yellow
    rustup install $RUST_VERSION
    rustup target add wasm32-unknown-unknown --toolchain $RUST_VERSION
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install Rust $RUST_VERSION" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  Found: $rustVersion" -ForegroundColor Green

# Initialize wallet (already done manually)
Write-Host ""
Write-Host "[3/7] Skipping wallet initialization (already done)..." -ForegroundColor Yellow

# Show chain info
Write-Host ""
Write-Host "[4/7] Getting chain information..." -ForegroundColor Yellow
$chainInfo = linera wallet show 2>&1
Write-Host $chainInfo

# Build contract with Rust 1.86.0 (required)
Write-Host ""
Write-Host "[5/7] Building smart contract with Rust $RUST_VERSION..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\smart_contract"
$buildResult = cargo +$RUST_VERSION build --release --target wasm32-unknown-unknown 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build smart contract" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    exit 1
}
Write-Host "  Build successful!" -ForegroundColor Green

# Publish module
Write-Host ""
Write-Host "[6/7] Publishing application module..." -ForegroundColor Yellow
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
Write-Host "[7/7] Creating application instance..." -ForegroundColor Yellow
# Initial balance (InstantiationArgument is u128)
$createResultOutput = (linera create-application $bytecodeId --json-argument "0" 2>&1 | Out-String)
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

# Get chain ID
$chainId = (linera wallet show 2>&1 | Select-String -Pattern "Chain: ([a-f0-9]+)" | ForEach-Object { $_.Matches.Groups[1].Value })

# Done!
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Network:        Testnet Conway" -ForegroundColor White
Write-Host "Application ID: $applicationId" -ForegroundColor White
Write-Host "Chain ID:       $chainId" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start local service:" -ForegroundColor Yellow
Write-Host "   linera service --port 8080" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open GraphiQL to test queries:" -ForegroundColor Yellow
Write-Host "   http://localhost:8080/chains/$chainId/applications/$applicationId" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure frontend (frontend/.env.local):" -ForegroundColor Yellow
Write-Host "   VITE_NETWORK=testnet" -ForegroundColor Gray
Write-Host "   VITE_APP_ID=$applicationId" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start frontend:" -ForegroundColor Yellow
Write-Host "   cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Testnet Explorer: https://explorer.testnet-conway.linera.net" -ForegroundColor Cyan
Write-Host ""
