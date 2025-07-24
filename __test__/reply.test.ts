import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import ReplyResolver from '../src/reply/index.js'
import type { Context, CommonRequest, CommonResponse } from '../src/type.js'

// 模拟上下文对象
const createMockContext = (responseData: any = null, headers: Record<string, any> = {}): Context<any, any> => {
  const mockHeaders: Record<string, any> = {}
  
  return {
    req: {} as CommonRequest,
    res: {
      statusCode: 200,
      getHeader: jest.fn((name: string) => headers[name.toLowerCase()]),
      setHeader: jest.fn((name: string, value: any) => {
        mockHeaders[name.toLowerCase()] = value
      }),
      _mockHeaders: mockHeaders
    } as any,
    protocol: 'http',
    pathname: '/',
    query: {},
    host: 'localhost',
    params: {},
    body: null,
    responseData,
    send: jest.fn(),
    code: jest.fn(),
    setHeader: jest.fn(),
    setHeaders: jest.fn(),
    setCookie: jest.fn(),
    getCookie: jest.fn(),
    getCookies: jest.fn(),
    deleteCookie: jest.fn(),
    clearCookie: jest.fn()
  }
}

describe('回复处理器测试', () => {
  describe('Content-Type 推断', () => {
    test('应该使用显式设置的 Content-Type', () => {
      const ctx = createMockContext('test', { 'content-type': 'text/plain' })
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain')
    })

    test('应该处理带参数的 Content-Type', () => {
      const ctx = createMockContext('test', { 'content-type': 'application/json; charset=utf-8' })
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json; charset=utf-8')
    })

    test('应该警告无效的 Content-Type', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createMockContext('test', { 'content-type': 'invalid/type' })
      
      ReplyResolver.contentType(ctx)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('设置了无效的 Content-Type')
      )
      consoleSpy.mockRestore()
    })

    test('应该为字符串推断文本类型', () => {
      const ctx = createMockContext('普通文本')
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
    })

    test('应该为 HTML 字符串推断 HTML 类型', () => {
      const ctx = createMockContext('<html><body>测试</body></html>')
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })

    test('应该为 DOCTYPE 推断 HTML 类型', () => {
      const ctx = createMockContext('<!DOCTYPE html><html></html>')
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })

    test('应该为 JSON 字符串推断 JSON 类型', () => {
      const ctx = createMockContext('{"key": "value"}')
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json; charset=utf-8')
    })

    test('应该为数组 JSON 字符串推断 JSON 类型', () => {
      const ctx = createMockContext('[1, 2, 3]')
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json; charset=utf-8')
    })

    test('应该为数字推断文本类型', () => {
      const ctx = createMockContext(123)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
    })

    test('应该为布尔值推断文本类型', () => {
      const ctx = createMockContext(true)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
    })

    test('应该为 BigInt 推断文本类型', () => {
      const ctx = createMockContext(BigInt(123))
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
    })

    test('应该为对象推断 JSON 类型', () => {
      const ctx = createMockContext({ key: 'value' })
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json; charset=utf-8')
    })

    test('应该为 Buffer 推断二进制类型', () => {
      const ctx = createMockContext(Buffer.from('test'))
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/octet-stream')
    })

    test('应该为函数推断文本类型', () => {
      const ctx = createMockContext(() => {})
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
    })

    test('应该为 Symbol 推断文本类型', () => {
      const ctx = createMockContext(Symbol('test'))
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
    })

    test('应该为 null 返回 undefined', () => {
      const ctx = createMockContext(null)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBeUndefined()
    })

    test('应该为 undefined 返回 undefined', () => {
      const ctx = createMockContext(undefined)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBeUndefined()
    })
  })

  describe('状态码推断', () => {
    test('应该使用显式设置的状态码', () => {
      const ctx = createMockContext('test')
      ctx.res.statusCode = 201
      
      const status = ReplyResolver.status(ctx)
      
      expect(status).toBe(201)
    })

    test('应该处理无效状态码', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createMockContext('test')
      ctx.res.statusCode = 999
      
      const status = ReplyResolver.status(ctx)
      
      expect(status).toBe(200)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('设置了无效的状态码')
      )
      consoleSpy.mockRestore()
    })

    test('应该为 null 数据返回 404', () => {
      const ctx = createMockContext(null)
      
      const status = ReplyResolver.status(ctx)
      
      expect(status).toBe(404)
    })

    test('应该为 undefined 数据返回 404', () => {
      const ctx = createMockContext(undefined)
      
      const status = ReplyResolver.status(ctx)
      
      expect(status).toBe(404)
    })

    test('应该为空字符串返回 204', () => {
      const ctx = createMockContext('')
      
      const status = ReplyResolver.status(ctx)
      
      expect(status).toBe(204)
    })

    test('应该为只有空格的字符串返回 204', () => {
      const ctx = createMockContext('   ')
      
      const status = ReplyResolver.status(ctx)
      
      expect(status).toBe(204)
    })

    test('应该为有效数据返回 200', () => {
      const ctx = createMockContext('有效数据')
      
      const status = ReplyResolver.status(ctx)
      
      expect(status).toBe(200)
    })

    test('应该验证状态码范围', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createMockContext('test')
      
      ctx.res.statusCode = 50  // 小于 100
      expect(ReplyResolver.status(ctx)).toBe(200)
      
      ctx.res.statusCode = 700 // 大于 599
      expect(ReplyResolver.status(ctx)).toBe(200)
      
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      consoleSpy.mockRestore()
    })
  })

  describe('数据序列化', () => {
    test('应该序列化字符串', () => {
      const ctx = createMockContext('测试字符串')
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBe('测试字符串')
    })

    test('应该序列化数字', () => {
      const ctx = createMockContext(123)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBe('123')
    })

    test('应该序列化布尔值', () => {
      const ctx = createMockContext(true)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBe('true')
    })

    test('应该序列化 BigInt', () => {
      const ctx = createMockContext(BigInt(123))
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBe('123')
    })

    test('应该序列化函数', () => {
      const testFunc = function test() { return 'hello' }
      const ctx = createMockContext(testFunc)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toContain('function test()')
    })

    test('应该序列化 Symbol', () => {
      const testSymbol = Symbol('test')
      const ctx = createMockContext(testSymbol)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toContain('Symbol(test)')
    })

    test('应该返回 Buffer', () => {
      const buffer = Buffer.from('测试')
      const ctx = createMockContext(buffer)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBe(buffer)
    })

    test('应该序列化 Date 对象', () => {
      const date = new Date('2023-01-01T00:00:00.000Z')
      const ctx = createMockContext(date)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBe('"2023-01-01T00:00:00.000Z"')
    })

    test('应该序列化 Error 对象', () => {
      const error = new Error('测试错误')
      const ctx = createMockContext(error)
      
      const data = ReplyResolver.data(ctx)
      const parsed = JSON.parse(data as string)
      
      expect(parsed.name).toBe('Error')
      expect(parsed.message).toBe('测试错误')
      expect(parsed.stack).toBeDefined()
    })

    test('应该序列化普通对象', () => {
      const obj = { name: '测试', value: 123 }
      const ctx = createMockContext(obj)
      
      const data = ReplyResolver.data(ctx)
      
      expect(JSON.parse(data as string)).toEqual(obj)
    })

    test('应该处理 null', () => {
      const ctx = createMockContext(null)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBeNull()
    })

    test('应该处理 undefined', () => {
      const ctx = createMockContext(undefined)
      
      const data = ReplyResolver.data(ctx)
      
      expect(data).toBeNull()
    })

    test('应该处理序列化错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // 创建循环引用对象
      const circular: any = { name: 'test' }
      circular.self = circular
      
      // 模拟 JSON.stringify 抛出错误
      const originalStringify = JSON.stringify
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('序列化错误')
      })
      
      const ctx = createMockContext(circular)
      const data = ReplyResolver.data(ctx)
      
      expect(consoleSpy).toHaveBeenCalledWith('序列化响应数据失败:', expect.any(Error))
      expect(data).toContain('响应数据序列化失败')
      
      // 恢复原始方法
      JSON.stringify = originalStringify
      consoleSpy.mockRestore()
    })

    test('应该处理 JSON 替换函数中的特殊值', () => {
      const obj = {
        bigint: BigInt(123),
        func: () => 'test',
        symbol: Symbol('test'),
        undef: undefined
      }
      const ctx = createMockContext(obj)
      
      const data = ReplyResolver.data(ctx)
      const parsed = JSON.parse(data as string)
      
      expect(parsed.bigint).toBe('123')
      expect(parsed.func).toContain('function')
      expect(parsed.symbol).toContain('Symbol')
      expect(parsed.undef).toBeNull()
    })
  })

  describe('内容长度计算', () => {
    test('应该正确计算字符串长度', () => {
      const ctx = createMockContext('测试中文')
      
      const length = ReplyResolver.getContentLength(ctx)
      
      expect(length).toBe(Buffer.byteLength('测试中文', 'utf8'))
    })

    test('应该正确计算 Buffer 长度', () => {
      const buffer = Buffer.from('test data')
      const ctx = createMockContext(buffer)
      
      const length = ReplyResolver.getContentLength(ctx)
      
      expect(length).toBe(buffer.length)
    })

    test('应该为空数据返回 0', () => {
      const ctx = createMockContext(null)
      
      const length = ReplyResolver.getContentLength(ctx)
      
      expect(length).toBe(0)
    })

    test('应该正确计算 JSON 对象长度', () => {
      const obj = { message: '测试' }
      const ctx = createMockContext(obj)
      
      const length = ReplyResolver.getContentLength(ctx)
      const expectedLength = Buffer.byteLength(JSON.stringify(obj, null, 2), 'utf8')
      
      expect(length).toBe(expectedLength)
    })
  })

  describe('缓存头部设置', () => {
    test('应该设置缓存控制头部', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCacheHeaders(ctx, { maxAge: 3600 })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('cache-control', 'public, max-age=3600')
    })

    test('应该设置 ETag 头部', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCacheHeaders(ctx, { etag: '"abc123"' })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('etag', '"abc123"')
    })

    test('应该设置 Last-Modified 头部', () => {
      const ctx = createMockContext('test')
      const date = new Date('2023-01-01T00:00:00.000Z')
      
      ReplyResolver.setCacheHeaders(ctx, { lastModified: date })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('last-modified', date.toUTCString())
    })

    test('应该设置无缓存头部', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCacheHeaders(ctx, { noCache: true })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('cache-control', 'no-cache, no-store, must-revalidate')
      expect(ctx.setHeader).toHaveBeenCalledWith('pragma', 'no-cache')
      expect(ctx.setHeader).toHaveBeenCalledWith('expires', '0')
    })

    test('应该组合多个缓存选项', () => {
      const ctx = createMockContext('test')
      const date = new Date('2023-01-01T00:00:00.000Z')
      
      ReplyResolver.setCacheHeaders(ctx, {
        maxAge: 3600,
        etag: '"abc123"',
        lastModified: date
      })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('cache-control', 'public, max-age=3600')
      expect(ctx.setHeader).toHaveBeenCalledWith('etag', '"abc123"')
      expect(ctx.setHeader).toHaveBeenCalledWith('last-modified', date.toUTCString())
    })
  })

  describe('CORS 头部设置', () => {
    test('应该设置默认 CORS 头部', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCorsHeaders(ctx)
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-origin', '*')
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-headers', 'Content-Type, Authorization')
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-max-age', '86400')
    })

    test('应该设置自定义源', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCorsHeaders(ctx, { origin: 'https://example.com' })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-origin', 'https://example.com')
    })

    test('应该处理多个源', () => {
      const ctx = createMockContext('test')
      ctx.req.headers = { origin: 'https://example.com' }
      
      ReplyResolver.setCorsHeaders(ctx, { 
        origin: ['https://example.com', 'https://test.com'] 
      })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-origin', 'https://example.com')
    })

    test('应该设置自定义方法', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCorsHeaders(ctx, { 
        methods: ['GET', 'POST'] 
      })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-methods', 'GET, POST')
    })

    test('应该设置自定义头部', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCorsHeaders(ctx, { 
        headers: ['Content-Type', 'X-Custom'] 
      })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-headers', 'Content-Type, X-Custom')
    })

    test('应该设置凭据支持', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCorsHeaders(ctx, { credentials: true })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-credentials', 'true')
    })

    test('应该设置自定义最大年龄', () => {
      const ctx = createMockContext('test')
      
      ReplyResolver.setCorsHeaders(ctx, { maxAge: 7200 })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-max-age', '7200')
    })

    test('应该组合所有 CORS 选项', () => {
      const ctx = createMockContext('test')
      ctx.req.headers = { origin: 'https://example.com' }
      
      ReplyResolver.setCorsHeaders(ctx, {
        origin: ['https://example.com'],
        methods: ['GET', 'POST'],
        headers: ['Content-Type'],
        credentials: true,
        maxAge: 3600
      })
      
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-origin', 'https://example.com')
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-methods', 'GET, POST')
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-headers', 'Content-Type')
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-allow-credentials', 'true')
      expect(ctx.setHeader).toHaveBeenCalledWith('access-control-max-age', '3600')
    })
  })

  describe('HTML 检测', () => {
    test('应该检测 DOCTYPE', () => {
      const html = '<!DOCTYPE html><html></html>'
      const ctx = createMockContext(html)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })

    test('应该检测 html 标签', () => {
      const html = '<html><body>内容</body></html>'
      const ctx = createMockContext(html)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })

    test('应该检测其他 HTML 标签', () => {
      const html = '<div>这是一个 div</div>'
      const ctx = createMockContext(html)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })

    test('应该忽略大小写', () => {
      const html = '<HTML><BODY>内容</BODY></HTML>'
      const ctx = createMockContext(html)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })

    test('应该处理带属性的标签', () => {
      const html = '<div class="test" id="main">内容</div>'
      const ctx = createMockContext(html)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })

    test('应该处理自闭合标签', () => {
      const html = '<img src="test.jpg" />'
      const ctx = createMockContext(html)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/html; charset=utf-8')
    })
  })

  describe('JSON 检测', () => {
    test('应该检测对象 JSON', () => {
      const json = '{"key": "value"}'
      const ctx = createMockContext(json)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json; charset=utf-8')
    })

    test('应该检测数组 JSON', () => {
      const json = '[1, 2, 3]'
      const ctx = createMockContext(json)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json; charset=utf-8')
    })

    test('应该忽略空格', () => {
      const json = '  {"key": "value"}  '
      const ctx = createMockContext(json)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json; charset=utf-8')
    })

    test('不应该将字符串识别为 JSON', () => {
      const text = '"just a string"'
      const ctx = createMockContext(text)
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
    })
  })

  describe('边界情况', () => {
    test('应该处理空响应数据', () => {
      const ctx = createMockContext('')
      
      const contentType = ReplyResolver.contentType(ctx)
      const status = ReplyResolver.status(ctx)
      const data = ReplyResolver.data(ctx)
      
      expect(contentType).toBe('text/plain; charset=utf-8')
      expect(status).toBe(204)
      expect(data).toBe('')
    })

    test('应该处理非常大的对象', () => {
      const largeObj = {}
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`
      }
      
      const ctx = createMockContext(largeObj)
      
      expect(() => {
        ReplyResolver.contentType(ctx)
        ReplyResolver.status(ctx)
        ReplyResolver.data(ctx)
      }).not.toThrow()
    })

    test('应该处理特殊字符', () => {
      const specialText = '特殊字符: 🚀 ñ ü ß'
      const ctx = createMockContext(specialText)
      
      const data = ReplyResolver.data(ctx)
      const length = ReplyResolver.getContentLength(ctx)
      
      expect(data).toBe(specialText)
      expect(length).toBe(Buffer.byteLength(specialText, 'utf8'))
    })

    test('应该处理数组形式的头部', () => {
      const ctx = createMockContext('test', { 'content-type': ['application/json', 'text/plain'] })
      
      const contentType = ReplyResolver.contentType(ctx)
      
      expect(contentType).toBe('application/json')
    })
  })
})