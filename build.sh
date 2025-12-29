#!/bin/bash
# EbitenStudio 构建脚本
# 用途: 构建UI运行时库和编辑器前端

set -e  # 遇到错误立即退出

echo "=== EbitenStudio 构建脚本 ==="

# 创建构建目录
buildDir="build"
if [ ! -d "$buildDir" ]; then
    mkdir -p "$buildDir"
    echo "✓ 创建构建目录: $buildDir"
fi

# 构建 UI 运行时库
echo ""
echo "[1/3] 构建 UI 运行时库..."
cd ui
go mod tidy
if [ $? -ne 0 ]; then
    echo "❌ go mod tidy 失败!"
    exit 1
fi

# 测试 UI 库
echo "  运行单元测试..."
go test ./...
if [ $? -ne 0 ]; then
    echo "⚠ 单元测试失败"
else
    echo "  ✓ 单元测试通过"
fi
cd ..
echo "✓ UI 运行时库检查完成"

# 构建 Viewer 预览器
echo ""
echo "[2/3] 构建 Viewer 预览器..."
cd ui/examples/viewer

# 根据操作系统设置可执行文件扩展名
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    execExt=".exe"
else
    execExt=""
fi

go build -o "../../../$buildDir/viewer$execExt" .
if [ $? -ne 0 ]; then
    echo "❌ Viewer 构建失败!"
    exit 1
fi
cd ../../..
echo "✓ Viewer 预览器构建完成"

# 安装前端依赖并启动
echo ""
echo "[3/3] 安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm install 失败!"
        exit 1
    fi
fi
echo "✓ 前端依赖安装完成"

# 启动编辑器
echo ""
echo "=== 启动编辑器 ==="
npm start
