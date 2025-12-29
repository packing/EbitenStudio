#!/bin/bash
# Git 初始化和推送脚本

set -e  # 遇到错误立即退出

echo "=== EbitenStudio Git 初始化 ==="

# 初始化 Git(如果还没初始化)
if [ ! -d ".git" ]; then
    echo ""
    echo "[1/5] 初始化 Git 仓库..."
    git init
    git branch -M main
    echo "✓ Git 仓库初始化完成"
else
    echo ""
    echo "[1/5] Git 仓库已存在,跳过初始化"
fi

# 添加远程仓库
echo ""
echo "[2/5] 配置远程仓库..."
remoteUrl="https://github.com/packing/EbitenStudio.git"
existingRemote=$(git remote get-url origin 2>/dev/null || true)

if [ -n "$existingRemote" ]; then
    echo "已存在远程仓库: $existingRemote"
    if [ "$existingRemote" != "$remoteUrl" ]; then
        git remote set-url origin "$remoteUrl"
        echo "✓ 远程仓库地址已更新"
    fi
else
    git remote add origin "$remoteUrl"
    echo "✓ 远程仓库添加完成"
fi

# 添加所有文件
echo ""
echo "[3/5] 添加文件到 Git..."
git add .
fileCount=$(git diff --cached --numstat | wc -l)
echo "✓ 已添加 $fileCount 个文件"

# 提交
echo ""
echo "[4/5] 提交更改..."
git commit -m "Initial commit: EbitenStudio UI Editor

- Frontend: Electron + Vanilla JS
- UI Runtime: Go + Ebiten v2
- Script System: TypeScript + Goja VM
- Features: Visual editor + Live preview + Script integration
- Architecture: Dual-window design (Editor + Viewer)"

if [ $? -ne 0 ]; then
    echo "⚠ 提交失败(可能没有更改)"
else
    echo "✓ 提交成功"
fi

# 推送
echo ""
echo "[5/5] 推送到 GitHub..."
git push -u origin main

if [ $? -ne 0 ]; then
    echo "⚠ 推送失败,可能需要手动认证"
    echo "请运行: git push -u origin main"
else
    echo "✓ 推送成功"
fi

echo ""
echo "=== Git 初始化完成 ==="
echo "仓库地址: $remoteUrl"
