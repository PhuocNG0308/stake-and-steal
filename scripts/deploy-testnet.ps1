# Steal & Yield - Linera Testnet Deployment Script
# Make sure LLVM is installed and LIBCLANG_PATH is set before running
# $env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Steal & Yield - Linera Deployment" -ForegroundColor Cyan  
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

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

# Initialize wallet
Write-Host ""
Write-Host "[2/6] Initializing wallet..." -ForegroundColor Yellow
$walletExists = Test-Path "$env:USERPROFILE\.config\linera\wallet.json"
if (-not $walletExists) {
    Write-Host "  Creating new wallet for Linera Testnet..." -ForegroundColor Gray
    linera wallet init --faucet https://faucet.testnet-babylonbee.linera.net --with-new-chain
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to initialize wallet" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  Wallet initialized!" -ForegroundColor Green

# Show chain info
Write-Host ""
Write-Host "[3/6] Getting chain information..." -ForegroundColor Yellow
$chainInfo = linera wallet show 2>&1
Write-Host $chainInfo

# Build contract (if needed)
Write-Host ""
Write-Host "[4/6] Building smart contract..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\smart_contract"
$buildResult = cargo build --release --target wasm32-unknown-unknown 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build smart contract" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    exit 1
}
Write-Host "  Build successful!" -ForegroundColor Green

# Publish bytecode
Write-Host ""
Write-Host "[5/6] Publishing application bytecode..." -ForegroundColor Yellow
$contractPath = "target/wasm32-unknown-unknown/release/steal_and_yield_contract.wasm"
$servicePath = "target/wasm32-unknown-unknown/release/steal_and_yield_service.wasm"

if (-not (Test-Path $contractPath) -or -not (Test-Path $servicePath)) {
    Write-Host "ERROR: WASM files not found. Please build first." -ForegroundColor Red
    exit 1
}

$publishResult = linera publish-bytecode $contractPath $servicePath 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to publish bytecode" -ForegroundColor Red
    Write-Host $publishResult -ForegroundColor Red
    exit 1
}
Write-Host "  Bytecode ID: $publishResult" -ForegroundColor Green
$bytecodeId = $publishResult

# Create application
Write-Host ""
Write-Host "[6/6] Creating application instance..." -ForegroundColor Yellow
# Initial balance of 1000 tokens
$createResult = linera create-application $bytecodeId --json-argument "1000" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create application" -ForegroundColor Red
    Write-Host $createResult -ForegroundColor Red
    exit 1
}
Write-Host "  Application ID: $createResult" -ForegroundColor Green

# Done!
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application ID: $createResult" -ForegroundColor White
Write-Host ""
Write-Host "To interact with your application:" -ForegroundColor Yellow
Write-Host "  linera service --port 8080" -ForegroundColor Gray
Write-Host ""
Write-Host "Then open GraphiQL at:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080/chains/<your-chain-id>/applications/$createResult" -ForegroundColor Gray
Write-Host ""
