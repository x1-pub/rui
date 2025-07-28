import { describe, test, expect } from '@jest/globals'
import { RuiError } from '../src/error/index.js'

describe('类型定义测试', () => {
  describe('RuiError', () => {
    test('应该正确创建 RuiError 实例', () => {
      const error = new RuiError('测试错误', 400, 'TEST_ERROR')
      
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(RuiError)
      expect(error.message).toBe('测试错误')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.name).toBe('RuiError')
    })

    test('应该使用默认状态码', () => {
      const error = new RuiError('测试错误')
      
      expect(error.statusCode).toBe(500)
      expect(error.code).toBeUndefined()
    })

    test('应该正确设置错误堆栈', () => {
      const error = new RuiError('测试错误')
      
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('RuiError: 测试错误')
    })
  })
})