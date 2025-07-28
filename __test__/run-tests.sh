#!/bin/bash

# 测试运行脚本
echo "🚀 开始运行 Rui 框架测试套件..."

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "📦 Node.js 版本: $NODE_VERSION"

# 检查是否安装了必要的依赖
if ! command -v jest &> /dev/null; then
    echo "❌ Jest 未安装，请先安装测试依赖"
    echo "运行: npm install --save-dev jest @types/jest ts-jest"
    exit 1
fi

# 设置测试环境变量
export NODE_ENV=test
export TZ=UTC

echo "🧪 运行测试..."

# 运行不同类型的测试
echo "📋 运行单元测试..."
jest --config __test__/jest.config.js --testPathPattern="__test__" --verbose

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ 所有测试通过！"
    
    # 显示覆盖率摘要
    echo "📊 测试覆盖率报告:"
    echo "详细报告请查看: coverage/index.html"
    
    # 运行性能测试（如果存在）
    if [ -f "__test__/performance.test.ts" ]; then
        echo "⚡ 运行性能测试..."
        jest --config __test__/jest.config.js --testPathPattern="performance.test.ts"
    fi
    
    echo "🎉 测试完成！框架质量良好。"
else
    echo "❌ 测试失败，请检查错误信息"
    exit 1
fi