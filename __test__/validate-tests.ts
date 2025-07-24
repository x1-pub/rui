import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * 测试验证脚本
 * 验证所有测试文件的完整性和覆盖率
 */

interface TestFile {
  name: string
  path: string
  required: boolean
  description: string
}

interface CoverageReport {
  total: {
    lines: { pct: number }
    functions: { pct: number }
    statements: { pct: number }
    branches: { pct: number }
  }
}

class TestValidator {
  private testFiles: TestFile[] = [
    {
      name: 'type.test.ts',
      path: '__test__/type.test.ts',
      required: true,
      description: '类型定义测试'
    },
    {
      name: 'core.test.ts',
      path: '__test__/core.test.ts',
      required: true,
      description: '核心应用测试'
    },
    {
      name: 'router.test.ts',
      path: '__test__/router.test.ts',
      required: true,
      description: '路由器测试'
    },
    {
      name: 'parser.test.ts',
      path: '__test__/parser.test.ts',
      required: true,
      description: '解析器测试'
    },
    {
      name: 'context.test.ts',
      path: '__test__/context.test.ts',
      required: true,
      description: '上下文测试'
    },
    {
      name: 'reply.test.ts',
      path: '__test__/reply.test.ts',
      required: true,
      description: '回复处理测试'
    },
    {
      name: 'http.test.ts',
      path: '__test__/http.test.ts',
      required: true,
      description: 'HTTP 应用测试'
    },
    {
      name: 'https.test.ts',
      path: '__test__/https.test.ts',
      required: true,
      description: 'HTTPS 应用测试'
    },
    {
      name: 'http2.test.ts',
      path: '__test__/http2.test.ts',
      required: true,
      description: 'HTTP/2 应用测试'
    },
    {
      name: 'http2s.test.ts',
      path: '__test__/http2s.test.ts',
      required: true,
      description: 'HTTP/2s 应用测试'
    }
  ]

  private minCoverageThreshold = {
    lines: 80,
    functions: 80,
    statements: 80,
    branches: 80
  }

  /**
   * 验证测试文件是否存在
   */
  validateTestFiles(): boolean {
    console.log('🔍 验证测试文件...')
    
    let allFilesExist = true
    
    for (const testFile of this.testFiles) {
      const exists = existsSync(testFile.path)
      const status = exists ? '✅' : '❌'
      const required = testFile.required ? '(必需)' : '(可选)'
      
      console.log(`${status} ${testFile.name} - ${testFile.description} ${required}`)
      
      if (testFile.required && !exists) {
        allFilesExist = false
      }
    }
    
    return allFilesExist
  }

  /**
   * 验证测试配置文件
   */
  validateTestConfig(): boolean {
    console.log('\n🔧 验证测试配置...')
    
    const configFiles = [
      { path: '__test__/jest.config.js', name: 'Jest 配置' },
      { path: '__test__/setup.ts', name: '测试设置' },
      { path: '__test__/run-tests.sh', name: '测试运行脚本' }
    ]
    
    let allConfigsExist = true
    
    for (const config of configFiles) {
      const exists = existsSync(config.path)
      const status = exists ? '✅' : '❌'
      
      console.log(`${status} ${config.name}`)
      
      if (!exists) {
        allConfigsExist = false
      }
    }
    
    return allConfigsExist
  }

  /**
   * 运行测试并获取结果
   */
  async runTests(): Promise<boolean> {
    console.log('\n🧪 运行测试套件...')
    
    try {
      // 设置环境变量
      process.env.NODE_ENV = 'test'
      
      // 运行测试
      const result = execSync(
        'npx jest --config __test__/jest.config.js --coverage --passWithNoTests',
        { 
          encoding: 'utf-8',
          stdio: 'pipe'
        }
      )
      
      console.log('✅ 所有测试通过')
      return true
      
    } catch (error: any) {
      console.log('❌ 测试失败')
      console.log(error.stdout || error.message)
      return false
    }
  }

  /**
   * 验证测试覆盖率
   */
  validateCoverage(): boolean {
    console.log('\n📊 验证测试覆盖率...')
    
    const coverageFile = 'coverage/coverage-summary.json'
    
    if (!existsSync(coverageFile)) {
      console.log('❌ 覆盖率报告不存在，请先运行测试')
      return false
    }
    
    try {
      const coverageData: CoverageReport = JSON.parse(
        readFileSync(coverageFile, 'utf-8')
      )
      
      const { total } = coverageData
      
      const metrics = [
        { name: '行覆盖率', value: total.lines.pct, threshold: this.minCoverageThreshold.lines },
        { name: '函数覆盖率', value: total.functions.pct, threshold: this.minCoverageThreshold.functions },
        { name: '语句覆盖率', value: total.statements.pct, threshold: this.minCoverageThreshold.statements },
        { name: '分支覆盖率', value: total.branches.pct, threshold: this.minCoverageThreshold.branches }
      ]
      
      let allMetricsPassed = true
      
      for (const metric of metrics) {
        const passed = metric.value >= metric.threshold
        const status = passed ? '✅' : '❌'
        
        console.log(`${status} ${metric.name}: ${metric.value.toFixed(1)}% (最低要求: ${metric.threshold}%)`)
        
        if (!passed) {
          allMetricsPassed = false
        }
      }
      
      return allMetricsPassed
      
    } catch (error) {
      console.log('❌ 无法解析覆盖率报告')
      return false
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(): void {
    console.log('\n📋 生成测试报告...')
    
    const report = {
      timestamp: new Date().toISOString(),
      testFiles: this.testFiles.length,
      requiredFiles: this.testFiles.filter(f => f.required).length,
      coverageThreshold: this.minCoverageThreshold,
      status: 'completed'
    }
    
    console.log('📈 测试统计:')
    console.log(`   - 测试文件总数: ${report.testFiles}`)
    console.log(`   - 必需测试文件: ${report.requiredFiles}`)
    console.log(`   - 覆盖率要求: ${report.coverageThreshold.lines}%+`)
    console.log(`   - 报告时间: ${report.timestamp}`)
  }

  /**
   * 主验证流程
   */
  async validate(): Promise<boolean> {
    console.log('🚀 开始验证 Rui 框架测试套件...\n')
    
    // 1. 验证测试文件
    const filesValid = this.validateTestFiles()
    if (!filesValid) {
      console.log('\n❌ 测试文件验证失败')
      return false
    }
    
    // 2. 验证配置文件
    const configValid = this.validateTestConfig()
    if (!configValid) {
      console.log('\n❌ 测试配置验证失败')
      return false
    }
    
    // 3. 运行测试
    const testsPass = await this.runTests()
    if (!testsPass) {
      console.log('\n❌ 测试运行失败')
      return false
    }
    
    // 4. 验证覆盖率
    const coverageValid = this.validateCoverage()
    if (!coverageValid) {
      console.log('\n❌ 覆盖率验证失败')
      return false
    }
    
    // 5. 生成报告
    this.generateReport()
    
    console.log('\n🎉 测试套件验证完成！所有检查都通过了。')
    console.log('\n📁 查看详细报告:')
    console.log('   - HTML 覆盖率报告: coverage/index.html')
    console.log('   - 测试结果报告: coverage/test-report.html')
    
    return true
  }
}

// 运行验证
if (require.main === module) {
  const validator = new TestValidator()
  
  validator.validate()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('验证过程中发生错误:', error)
      process.exit(1)
    })
}

export default TestValidator