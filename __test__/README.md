# Rui 框架测试套件

这是 Rui Node.js/TypeScript 服务端框架的完整测试套件，提供全面的单元测试、集成测试和性能测试。

## 📋 测试覆盖范围

### 核心模块测试
- **类型定义测试** (`type.test.ts`) - 验证所有 TypeScript 类型定义
- **核心应用测试** (`core.test.ts`) - 测试 App 基类的所有功能
- **路由器测试** (`router.test.ts`) - 验证路由匹配、参数解析、路由组等功能
- **解析器测试** (`parser.test.ts`) - 测试请求体解析、文件上传、错误处理
- **上下文测试** (`context.test.ts`) - 验证请求上下文的所有方法和属性
- **回复处理测试** (`reply.test.ts`) - 测试响应处理、内容类型推断、错误响应

### 入口文件测试
- **HTTP 应用测试** (`http.test.ts`) - HTTP 服务器功能测试
- **HTTPS 应用测试** (`https.test.ts`) - HTTPS 服务器和安全功能测试
- **HTTP/2 应用测试** (`http2.test.ts`) - HTTP/2 服务器推送、流控制测试
- **HTTP/2s 应用测试** (`http2s.test.ts`) - HTTP/2 安全服务器、TLS 验证测试

## 🎯 测试特性

### 高覆盖率
- **行覆盖率**: 目标 80%+
- **分支覆盖率**: 目标 80%+
- **函数覆盖率**: 目标 80%+
- **语句覆盖率**: 目标 80%+

### 全面的测试场景
- ✅ 正常功能测试
- ✅ 错误处理测试
- ✅ 边界条件测试
- ✅ 性能基准测试
- ✅ 类型安全测试
- ✅ 并发处理测试
- ✅ 内存泄漏检测
- ✅ 安全特性测试

### 测试类型
- **单元测试**: 测试单个函数和方法
- **集成测试**: 测试模块间的交互
- **端到端测试**: 测试完整的请求-响应流程
- **性能测试**: 验证性能指标和资源使用
- **安全测试**: 验证安全中间件和 TLS 功能

## 🚀 运行测试

### 快速开始
```bash
# 运行所有测试
npm test

# 或使用测试脚本
chmod +x __test__/run-tests.sh
./__test__/run-tests.sh
```

### 详细命令
```bash
# 运行特定测试文件
npx jest __test__/core.test.ts

# 运行测试并生成覆盖率报告
npx jest --coverage

# 监视模式运行测试
npx jest --watch

# 运行性能测试
npx jest --testPathPattern="performance"

# 运行安全相关测试
npx jest --testPathPattern="https|http2s"
```

## 📊 测试报告

测试完成后会生成以下报告：

### 覆盖率报告
- **HTML 报告**: `coverage/index.html`
- **LCOV 报告**: `coverage/lcov.info`
- **JSON 报告**: `coverage/coverage-final.json`

### 测试结果报告
- **HTML 报告**: `coverage/test-report.html`
- **控制台输出**: 详细的测试结果和错误信息

## 🔧 测试配置

### Jest 配置 (`jest.config.js`)
- TypeScript 支持
- ESM 模块支持
- 覆盖率配置
- 测试超时设置
- 并发测试配置

### 环境设置 (`setup.ts`)
- 全局测试配置
- 模拟对象设置
- 测试工具函数
- 错误处理配置

## 📝 测试编写指南

### 测试结构
```typescript
describe('模块名称', () => {
  beforeEach(() => {
    // 测试前设置
  })

  afterEach(() => {
    // 测试后清理
  })

  describe('功能分组', () => {
    test('应该执行特定功能', () => {
      // 测试实现
    })
  })
})
```

### 最佳实践
1. **描述性测试名称**: 使用清晰的中文描述
2. **独立测试**: 每个测试应该独立运行
3. **完整覆盖**: 测试正常流程和异常情况
4. **性能考虑**: 避免过长的测试执行时间
5. **模拟对象**: 合理使用 Mock 和 Spy
6. **断言清晰**: 使用具体的断言而非通用断言

### 测试分类
- **单元测试**: 测试单个函数或方法
- **集成测试**: 测试模块间交互
- **功能测试**: 测试完整功能流程
- **性能测试**: 验证性能指标
- **安全测试**: 验证安全特性

## 🛠️ 调试测试

### 调试单个测试
```bash
# 使用 Node.js 调试器
node --inspect-brk node_modules/.bin/jest --runInBand __test__/core.test.ts
```

### 查看详细输出
```bash
# 显示详细日志
npx jest --verbose --no-coverage

# 显示所有输出
npx jest --verbose --silent=false
```

## 📈 持续集成

测试套件支持在 CI/CD 环境中运行：

### GitHub Actions
```yaml
- name: 运行测试
  run: |
    npm install
    npm test
    
- name: 上传覆盖率报告
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### 本地 Git Hooks
```bash
# 提交前运行测试
git add .husky/pre-commit
echo "npm test" > .husky/pre-commit
chmod +x .husky/pre-commit
```

## 🔍 测试指标

### 性能基准
- **路由匹配**: < 1ms (1000 路由)
- **中间件执行**: < 10ms (100 中间件)
- **请求处理**: < 50ms (简单请求)
- **内存使用**: < 100MB (基础应用)

### 质量指标
- **测试覆盖率**: > 80%
- **测试通过率**: 100%
- **性能回归**: < 5%
- **内存泄漏**: 0 检测

## 🤝 贡献测试

### 添加新测试
1. 在相应的测试文件中添加测试用例
2. 确保测试覆盖新功能的所有分支
3. 运行测试确保通过
4. 更新文档说明新测试的目的

### 测试命名规范
- 使用中文描述测试目的
- 格式: `应该 + 动作 + 预期结果`
- 例如: `应该正确解析 JSON 请求体`

### 提交测试
```bash
git add __test__/
git commit -m "feat: 添加 XXX 功能的测试用例"
```

## 📚 相关资源

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [TypeScript Jest 配置](https://jestjs.io/docs/getting-started#using-typescript)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Node.js 测试指南](https://nodejs.org/en/docs/guides/testing/)

---

**注意**: 这个测试套件是 Rui 框架质量保证的重要组成部分。所有的功能修改都应该伴随相应的测试更新，确保框架的稳定性和可靠性。