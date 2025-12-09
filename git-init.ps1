#!/usr/bin/env pwsh
# Git 初始化和推送脚本

$ErrorActionPreference = "Stop"

Write-Host "=== EbitenStudio Git 初始化 ===" -ForegroundColor Cyan

# 进入项目目录
Set-Location H:\e_code_backup\github\repo\EbitenStudio

# 初始化 Git(如果还没初始化)
if (!(Test-Path ".git")) {
    Write-Host "`n[1/5] 初始化 Git 仓库..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "✓ Git 仓库初始化完成" -ForegroundColor Green
} else {
    Write-Host "`n[1/5] Git 仓库已存在,跳过初始化" -ForegroundColor Gray
}

# 添加远程仓库
Write-Host "`n[2/5] 配置远程仓库..." -ForegroundColor Yellow
$remoteUrl = "https://github.com/packing/EbitenStudio.git"
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    Write-Host "已存在远程仓库: $existingRemote" -ForegroundColor Gray
    if ($existingRemote -ne $remoteUrl) {
        git remote set-url origin $remoteUrl
        Write-Host "✓ 远程仓库地址已更新" -ForegroundColor Green
    }
} else {
    git remote add origin $remoteUrl
    Write-Host "✓ 远程仓库添加完成" -ForegroundColor Green
}

# 添加所有文件
Write-Host "`n[3/5] 添加文件到 Git..." -ForegroundColor Yellow
git add .
$fileCount = (git diff --cached --numstat | Measure-Object).Count
Write-Host "✓ 已添加 $fileCount 个文件" -ForegroundColor Green

# 提交
Write-Host "`n[4/5] 提交更改..." -ForegroundColor Yellow
git commit -m "Initial commit: Complete EbitenStudio architecture

- Backend: Go + Gin + Ebiten Canvas
- Frontend: Electron + Vanilla JS
- Features: REST API + WebSocket real-time sync
- Architecture: Dual-window design (Editor + Canvas)
"
Write-Host "✓ 提交完成" -ForegroundColor Green

# 推送到 GitHub
Write-Host "`n[5/5] 推送到 GitHub..." -ForegroundColor Yellow
Write-Host "正在推送到: $remoteUrl" -ForegroundColor Cyan

try {
    git push -u origin main
    Write-Host "`n✓ 成功推送到 GitHub!" -ForegroundColor Green
    Write-Host "`n项目地址: https://github.com/packing/EbitenStudio" -ForegroundColor Cyan
} catch {
    Write-Host "`n⚠ 推送失败,请手动执行:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main" -ForegroundColor White
    Write-Host "`n可能需要先配置 GitHub 认证" -ForegroundColor Gray
}

Write-Host "`n=== 完成 ===" -ForegroundColor Cyan
