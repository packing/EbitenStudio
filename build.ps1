#!/usr/bin/env pwsh

Write-Host "=== EbitenStudio 构建脚本 ===" -ForegroundColor Cyan

# 创建构建目录
$buildDir = "build"
if (!(Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

# 构建 Ebiten WASM Canvas
Write-Host "`n[1/4] 构建 Ebiten WASM Canvas..." -ForegroundColor Yellow
Push-Location backend/canvas_wasm
.\build.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WASM 构建失败!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✓ Canvas WASM 构建完成" -ForegroundColor Green

# 构建 Go 后端 API (可选)
Write-Host "`n[2/4] 构建 Go 后端 API..." -ForegroundColor Yellow
Push-Location backend
go mod tidy
if ($LASTEXITCODE -ne 0) {
    Write-Host "go mod tidy 失败!" -ForegroundColor Red
    Pop-Location
    exit 1
}

go build -o "../$buildDir/backend.exe" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ 后端 API 构建失败(可选)" -ForegroundColor Yellow
} else {
    Write-Host "✓ 后端 API 构建完成" -ForegroundColor Green
}
Pop-Location

# 安装前端依赖
Write-Host "`n[3/4] 安装前端依赖..." -ForegroundColor Yellow
Push-Location frontend
if (!(Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install 失败!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Pop-Location
Write-Host "✓ 依赖安装完成" -ForegroundColor Green

# 启动应用
Write-Host "`n[4/4] 启动应用..." -ForegroundColor Yellow
Push-Location frontend
npm start
Pop-Location
