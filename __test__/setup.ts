import { jest } from '@jest/globals'

// // 全局测试设置
// beforeAll(() => {
//   // 设置测试环境
//   process.env.NODE_ENV = 'test'
// })

// afterAll(() => {
//   // 清理测试环境
// })

// 模拟 console 方法以避免测试输出干扰
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
}

// 设置测试超时
jest.setTimeout(10000)