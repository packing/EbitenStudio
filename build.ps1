#!/usr/bin/env pwsh

Write-Host "=== EbitenStudio 构建脚本 ===" -ForegroundColor Cyan

# 创建构建目录
$buildDir = "build"
if (!(Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

# 构建 Go 后端
Write-Host "`n[1/3] 构建 Go 后端..." -ForegroundColor Yellow
Push-Location backend
go mod tidy
if ($LASTEXITCODE -ne 0) {
    Write-Host "go mod tidy 失败!" -ForegroundColor Red
    Pop-Location
    exit 1
}

go build -o "../$buildDir/backend.exe" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Go 构建失败!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✓ 后端构建完成" -ForegroundColor Green

# 安装前端依赖
Write-Host "`n[2/3] 安装前端依赖..." -ForegroundColor Yellow
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
Write-Host "`n[3/3] 启动应用..." -ForegroundColor Yellow
Push-Location frontend
npm start
Pop-Location
