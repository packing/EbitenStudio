#!/usr/bin/env pwsh
# EbitenStudio 构建脚本
# 用途: 构建UI运行时库和编辑器前端

Write-Host "=== EbitenStudio 构建脚本 ===" -ForegroundColor Cyan

# 创建构建目录
$buildDir = "build"
if (!(Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
    Write-Host "✓ 创建构建目录: $buildDir" -ForegroundColor Green
}

# 构建 UI 运行时库
Write-Host "`n[1/3] 构建 UI 运行时库..." -ForegroundColor Yellow
Push-Location ui
go mod tidy
if ($LASTEXITCODE -ne 0) {
    Write-Host "go mod tidy 失败!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# 测试 UI 库
Write-Host "  运行单元测试..." -ForegroundColor Gray
go test ./...
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ 单元测试失败" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ 单元测试通过" -ForegroundColor Green
}
Pop-Location
Write-Host "✓ UI 运行时库检查完成" -ForegroundColor Green

# 构建 Viewer 预览器
Write-Host "`n[2/3] 构建 Viewer 预览器..." -ForegroundColor Yellow
Push-Location ui/examples/viewer
go build -o "../../../$buildDir/viewer.exe" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Viewer 构建失败!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✓ Viewer 预览器构建完成" -ForegroundColor Green

# 安装前端依赖并启动
Write-Host "`n[3/3] 安装前端依赖..." -ForegroundColor Yellow
Push-Location frontend
if (!(Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install 失败!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Write-Host "✓ 前端依赖安装完成" -ForegroundColor Green

# 启动编辑器
Write-Host "`n=== 启动编辑器 ===" -ForegroundColor Cyan
npm start
Pop-Location
