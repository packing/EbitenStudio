#!/usr/bin/env pwsh

Write-Host "Building Ebiten WASM..." -ForegroundColor Cyan

$env:GOOS = "js"
$env:GOARCH = "wasm"

Write-Host "Compiling..." -ForegroundColor Yellow

go build -o ../frontend/public/canvas.wasm .

if ($LASTEXITCODE -eq 0) {
    Write-Host "WASM compiled successfully" -ForegroundColor Green
    
    # Copy wasm_exec.js
    $goRoot = go env GOROOT
    $wasmExec = "$goRoot\misc\wasm\wasm_exec.js"
    
    if (Test-Path $wasmExec) {
        Copy-Item $wasmExec ../frontend/public/wasm_exec.js
        Write-Host "wasm_exec.js copied" -ForegroundColor Green
    }
    
    $wasmSize = (Get-Item ../frontend/public/canvas.wasm).Length / 1MB
    Write-Host "File size: $($wasmSize.ToString('0.00')) MB" -ForegroundColor Cyan
} else {
    Write-Host "Build failed" -ForegroundColor Red
}
