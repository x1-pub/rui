import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import context from '../src/context/index.js'
import type { HttpContext } from '../src/type'

// 模拟请求对象
const createMockRequest = (options: any = {}) => ({
  method: 'GET',
  url: '/',
  headers: {},
  socket: { encrypted: false, remoteAddress: '127.0.0.1' },
  ...options
})

// 模拟响应对象
const createMockResponse = () => {
  const headers: Record<string, any> = {}
  return {
    statusCode: 200,
    setHeader: jest.fn((name: string, value: any) => {
      headers[name.toLowerCase()] = value
    }),
    getHeader: jest.fn((name: string) => headers[name.toLowerCase()]),
    _headers: headers // 用于测试验证
  }
}

// 创建测试上下文
const createTestContext = (reqOptions: any = {}, resOptions: any = {}): HttpContext => {
  const req = createMockRequest(reqOptions)
  const res = createMockResponse()
  
  const ctx = Object.create(context) as HttpContext
  ctx.req = req
  ctx.res = { ...res, ...resOptions }
  
  return ctx
}

describe('上下文模块测试', () => {
  describe('协议检测', () => {
    test('应该正确检测 HTTP 协议', () => {
      const ctx = createTestContext()
      expect(ctx.protocol).toBe('http')
    })

    test('应该正确检测 HTTPS 协议（通过加密连接）', () => {
      const ctx = createTestContext({
        socket: { encrypted: true }
      })
      expect(ctx.protocol).toBe('https')
    })

    test('应该正确检测 HTTPS 协议（通过代理头部）', () => {
      const ctx = createTestContext({
        headers: { 'x-forwarded-proto': 'https' }
      })
      expect(ctx.protocol).toBe('https')
    })

    test('代理头部应该优先于连接状态', () => {
      const ctx = createTestContext({
        headers: { 'x-forwarded-proto': 'http' },
        socket: { encrypted: true }
      })
      expect(ctx.protocol).toBe('http')
    })
  })

  describe('主机名获取', () => {
    test('应该从 host 头部获取主机名', () => {
      const ctx = createTestContext({
        headers: { host: 'example.com' }
      })
      expect(ctx.host).toBe('example.com')
    })

    test('应该优先使用 x-forwarded-host', () => {
      const ctx = createTestContext({
        headers: {
          'x-forwarded-host': 'proxy.example.com',
          host: 'example.com'
        }
      })
      expect(ctx.host).toBe('proxy.example.com')
    })

    test('应该处理数组形式的头部', () => {
      const ctx = createTestContext({
        headers: {
          'x-forwarded-host': ['first.example.com', 'second.example.com']
        }
      })
      expect(ctx.host).toBe('first.example.com')
    })

    test('应该处理缺失的主机头部', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      expect(ctx.host).toBe('')
      expect(consoleSpy).toHaveBeenCalledWith('无法从请求头中获取主机信息')
      
      consoleSpy.mockRestore()
    })
  })

  describe('状态码设置', () => {
    test('应该正确设置有效状态码', () => {
      const ctx = createTestContext()
      const result = ctx.code(404)
      
      expect(result).toBe(ctx)
      expect(ctx.res.statusCode).toBe(404)
    })

    test('应该拒绝无效状态码', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      const result = ctx.code(999)
      
      expect(result).toBe(ctx)
      expect(ctx.res.statusCode).toBe(200) // 应该保持原状态码
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该拒绝非数字状态码', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      const result = ctx.code('invalid' as any)
      
      expect(result).toBe(ctx)
      expect(ctx.res.statusCode).toBe(200)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该拒绝超出范围的状态码', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      ctx.code(50)  // 小于 100
      ctx.code(700) // 大于 599
      
      expect(ctx.res.statusCode).toBe(200)
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      
      consoleSpy.mockRestore()
    })
  })

  describe('响应数据设置', () => {
    test('应该正确设置响应数据', () => {
      const ctx = createTestContext()
      const data = { message: 'test' }
      
      const result = ctx.send(data)
      
      expect(result).toBe(ctx)
      expect(ctx._responseData).toBe(data)
    })

    test('应该支持不同类型的响应数据', () => {
      const ctx = createTestContext()
      
      ctx.send('string')
      expect(ctx._responseData).toBe('string')
      
      ctx.send(123)
      expect(ctx._responseData).toBe(123)
      
      ctx.send(null)
      expect(ctx._responseData).toBe(null)
      
      const buffer = Buffer.from('test')
      ctx.send(buffer)
      expect(ctx._responseData).toBe(buffer)
    })
  })

  describe('头部设置', () => {
    test('应该正确设置单个头部', () => {
      const ctx = createTestContext()
      
      ctx.setHeader('Content-Type', 'application/json')
      
      expect(ctx.res.setHeader).toHaveBeenCalledWith('content-type', 'application/json')
    })

    test('应该处理无效的头部名称', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      ctx.setHeader('', 'value')
      ctx.setHeader('   ', 'value')
      
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      consoleSpy.mockRestore()
    })

    test('应该正确设置多个头部', () => {
      const ctx = createTestContext()
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Custom': 'value'
      }
      
      ctx.setHeaders(headers)
      
      expect(ctx.res.setHeader).toHaveBeenCalledTimes(3)
      expect(ctx.res.setHeader).toHaveBeenCalledWith('content-type', 'application/json')
      expect(ctx.res.setHeader).toHaveBeenCalledWith('cache-control', 'no-cache')
      expect(ctx.res.setHeader).toHaveBeenCalledWith('x-custom', 'value')
    })

    test('应该跳过 undefined 和 null 值', () => {
      const ctx = createTestContext()
      const headers = {
        'Valid-Header': 'value',
        'Undefined-Header': undefined,
        'Null-Header': null
      }
      
      ctx.setHeaders(headers)
      
      expect(ctx.res.setHeader).toHaveBeenCalledTimes(1)
      expect(ctx.res.setHeader).toHaveBeenCalledWith('valid-header', 'value')
    })

    test('应该处理无效的头部对象', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      ctx.setHeaders(null as any)
      ctx.setHeaders('invalid' as any)
      
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      consoleSpy.mockRestore()
    })
  })

  describe('Cookie 管理', () => {
    test('应该正确设置 Cookie', () => {
      const ctx = createTestContext()
      
      ctx.setCookie('test', 'value')
      
      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'set-cookie',
        expect.arrayContaining([expect.stringContaining('test=value')])
      )
    })

    test('应该设置默认安全选项', () => {
      const ctx = createTestContext()
      
      ctx.setCookie('test', 'value')
      
      const setCookieCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'set-cookie'
      )
      const cookieString = setCookieCall[1][0]
      
      expect(cookieString).toContain('HttpOnly')
      expect(cookieString).toContain('SameSite=Lax')
    })

    test('应该在 HTTPS 下设置 Secure', () => {
      const ctx = createTestContext({
        socket: { encrypted: true }
      })
      
      ctx.setCookie('test', 'value')
      
      const setCookieCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'set-cookie'
      )
      const cookieString = setCookieCall[1][0]
      
      expect(cookieString).toContain('Secure')
    })

    test('应该支持自定义 Cookie 选项', () => {
      const ctx = createTestContext()
      
      ctx.setCookie('test', 'value', {
        maxAge: 3600,
        domain: 'example.com',
        path: '/api'
      })
      
      const setCookieCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'set-cookie'
      )
      const cookieString = setCookieCall[1][0]
      
      expect(cookieString).toContain('Max-Age=3600')
      expect(cookieString).toContain('Domain=example.com')
      expect(cookieString).toContain('Path=/api')
    })

    test('应该处理多个 Cookie', () => {
      const ctx = createTestContext()
      
      // 模拟已存在的 Cookie
      ctx.res.getHeader = jest.fn().mockReturnValue(['existing=cookie'])
      
      ctx.setCookie('new', 'value')
      
      expect(ctx.res.setHeader).toHaveBeenCalledWith(
        'set-cookie',
        ['existing=cookie', expect.stringContaining('new=value')]
      )
    })

    test('应该正确获取 Cookie', () => {
      const ctx = createTestContext({
        headers: { cookie: 'test=value; another=value2' }
      })
      
      expect(ctx.getCookie('test')).toBe('value')
      expect(ctx.getCookie('another')).toBe('value2')
      expect(ctx.getCookie('nonexistent')).toBeUndefined()
    })

    test('应该正确获取所有 Cookie', () => {
      const ctx = createTestContext({
        headers: { cookie: 'test=value; another=value2' }
      })
      
      const cookies = ctx.getCookies()
      expect(cookies).toEqual({
        test: 'value',
        another: 'value2'
      })
    })

    test('应该处理空 Cookie 头部', () => {
      const ctx = createTestContext()
      
      const cookies = ctx.getCookies()
      expect(cookies).toEqual({})
    })

    test('应该处理数组形式的 Cookie 头部', () => {
      const ctx = createTestContext({
        headers: { cookie: ['test=value', 'another=value2'] }
      })
      
      expect(ctx.getCookie('test')).toBe('value')
    })

    test('应该正确删除 Cookie', () => {
      const ctx = createTestContext()
      
      ctx.deleteCookie('test')
      
      const setCookieCall = (ctx.res.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'set-cookie'
      )
      const cookieString = setCookieCall[1][0]
      
      expect(cookieString).toContain('test=')
      expect(cookieString).toContain('Max-Age=-1')
      expect(cookieString).toContain('Path=/')
    })

    test('应该正确清除所有 Cookie', () => {
      const ctx = createTestContext({
        headers: { cookie: 'test1=value1; test2=value2' }
      })
      
      ctx.clearCookie()
      
      expect(ctx.res.setHeader).toHaveBeenCalledTimes(2)
    })

    test('应该处理无效的 Cookie 参数', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      ctx.setCookie('', 'value')
      ctx.setCookie('test', 123 as any)
      ctx.getCookie('')
      ctx.deleteCookie('')
      
      expect(consoleSpy).toHaveBeenCalledTimes(4)
      consoleSpy.mockRestore()
    })

    test('应该处理 Cookie 解析错误', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext({
        headers: { cookie: 'invalid-cookie-format' }
      })
      
      // 模拟解析错误
      jest.spyOn(require('cookie'), 'parse').mockImplementationOnce(() => {
        throw new Error('解析错误')
      })
      
      const cookies = ctx.getCookies()
      expect(cookies).toEqual({})
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('便利方法', () => {
    test('应该正确发送 JSON 响应', () => {
      const ctx = createTestContext()
      const data = { message: 'test' }
      
      const result = ctx.json(data)
      
      expect(result).toBe(ctx)
      expect(ctx.res.setHeader).toHaveBeenCalledWith('content-type', 'application/json; charset=utf-8')
      expect(ctx._responseData).toBe(data)
    })

    test('应该正确发送文本响应', () => {
      const ctx = createTestContext()
      const text = '测试文本'
      
      const result = ctx.text(text)
      
      expect(result).toBe(ctx)
      expect(ctx.res.setHeader).toHaveBeenCalledWith('content-type', 'text/plain; charset=utf-8')
      expect(ctx._responseData).toBe(text)
    })

    test('应该正确发送 HTML 响应', () => {
      const ctx = createTestContext()
      const html = '<h1>测试</h1>'
      
      const result = ctx.html(html)
      
      expect(result).toBe(ctx)
      expect(ctx.res.setHeader).toHaveBeenCalledWith('content-type', 'text/html; charset=utf-8')
      expect(ctx._responseData).toBe(html)
    })

    test('应该正确处理重定向', () => {
      const ctx = createTestContext()
      const url = 'https://example.com'
      
      const result = ctx.redirect(url)
      
      expect(result).toBe(ctx)
      expect(ctx.res.statusCode).toBe(302)
      expect(ctx.res.setHeader).toHaveBeenCalledWith('location', url)
      expect(ctx._responseData).toBe('')
    })

    test('应该支持自定义重定向状态码', () => {
      const ctx = createTestContext()
      
      ctx.redirect('https://example.com', 301)
      
      expect(ctx.res.statusCode).toBe(301)
    })

    test('应该处理无效的重定向 URL', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const ctx = createTestContext()
      
      ctx.redirect('')
      ctx.redirect('   ')
      
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      consoleSpy.mockRestore()
    })
  })

  describe('客户端信息获取', () => {
    test('应该正确获取客户端 IP', () => {
      const ctx = createTestContext({
        socket: { remoteAddress: '192.168.1.1' }
      })
      
      expect(ctx.ip).toBe('192.168.1.1')
    })

    test('应该优先使用 x-forwarded-for', () => {
      const ctx = createTestContext({
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' },
        socket: { remoteAddress: '10.0.0.1' }
      })
      
      expect(ctx.ip).toBe('203.0.113.1')
    })

    test('应该使用 x-real-ip 作为备选', () => {
      const ctx = createTestContext({
        headers: { 'x-real-ip': '203.0.113.1' },
        socket: { remoteAddress: '10.0.0.1' }
      })
      
      expect(ctx.ip).toBe('203.0.113.1')
    })

    test('应该处理数组形式的 IP 头部', () => {
      const ctx = createTestContext({
        headers: { 'x-forwarded-for': ['203.0.113.1', '192.168.1.1'] }
      })
      
      expect(ctx.ip).toBe('203.0.113.1')
    })

    test('应该处理缺失的 IP 信息', () => {
      const ctx = createTestContext({
        socket: {}
      })
      
      expect(ctx.ip).toBe('unknown')
    })

    test('应该正确获取用户代理', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      const ctx = createTestContext({
        headers: { 'user-agent': userAgent }
      })
      
      expect(ctx.userAgent).toBe(userAgent)
    })

    test('应该处理数组形式的用户代理', () => {
      const ctx = createTestContext({
        headers: { 'user-agent': ['Mozilla/5.0', 'Chrome/91.0'] }
      })
      
      expect(ctx.userAgent).toBe('Mozilla/5.0')
    })

    test('应该处理缺失的用户代理', () => {
      const ctx = createTestContext()
      
      expect(ctx.userAgent).toBe('')
    })
  })

  describe('请求类型检测', () => {
    test('应该正确检测 AJAX 请求', () => {
      const ctx = createTestContext({
        headers: { 'x-requested-with': 'XMLHttpRequest' }
      })
      
      expect(ctx.isAjax).toBe(true)
    })

    test('应该正确检测非 AJAX 请求', () => {
      const ctx = createTestContext()
      
      expect(ctx.isAjax).toBe(false)
    })

    test('应该处理数组形式的 x-requested-with', () => {
      const ctx = createTestContext({
        headers: { 'x-requested-with': ['XMLHttpRequest', 'other'] }
      })
      
      expect(ctx.isAjax).toBe(true)
    })

    test('应该正确检测 JSON 接受类型', () => {
      const ctx = createTestContext({
        headers: { accept: 'application/json, text/plain, */*' }
      })
      
      expect(ctx.acceptsJson).toBe(true)
    })

    test('应该正确检测 HTML 接受类型', () => {
      const ctx = createTestContext({
        headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
      })
      
      expect(ctx.acceptsHtml).toBe(true)
    })

    test('应该处理不接受 JSON 的情况', () => {
      const ctx = createTestContext({
        headers: { accept: 'text/plain, text/html' }
      })
      
      expect(ctx.acceptsJson).toBe(false)
    })

    test('应该处理不接受 HTML 的情况', () => {
      const ctx = createTestContext({
        headers: { accept: 'application/json, application/xml' }
      })
      
      expect(ctx.acceptsHtml).toBe(false)
    })

    test('应该处理数组形式的 accept 头部', () => {
      const ctx = createTestContext({
        headers: { accept: ['application/json', 'text/html'] }
      })
      
      expect(ctx.acceptsJson).toBe(true)
    })

    test('应该处理缺失的 accept 头部', () => {
      const ctx = createTestContext()
      
      expect(ctx.acceptsJson).toBe(false)
      expect(ctx.acceptsHtml).toBe(false)
    })
  })

  describe('边界情况', () => {
    test('应该处理响应数据为 undefined', () => {
      const ctx = createTestContext()
      
      ctx.send(undefined)
      expect(ctx._responseData).toBeUndefined()
    })

    test('应该处理复杂的嵌套对象', () => {
      const ctx = createTestContext()
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        }
      }
      
      ctx.json(complexData)
      expect(ctx._responseData).toBe(complexData)
    })

    test('应该处理循环引用对象', () => {
      const ctx = createTestContext()
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj
      
      // 不应该抛出错误
      expect(() => ctx.json(circularObj)).not.toThrow()
    })
  })
})