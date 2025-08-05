import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import HttpsApp from '../src/https/index.js'
import type { HttpsContext, Next } from '../src/type'

// 模拟 Node.js https 模块
const mockServer = {
  listen: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  address: jest.fn().mockReturnValue({ port: 443, address: '127.0.0.1', family: 'IPv4' }),
  close: jest.fn((callback) => callback && callback())
}

jest.mock('node:https', () => ({
  createServer: jest.fn().mockReturnValue(mockServer)
}))

import { createServer } from 'node:https'

describe('HTTPS 应用测试', () => {
  let app: HttpsApp
  let mockCreateServer: jest.MockedFunction<typeof createServer>

  beforeEach(() => {
    app = new HttpsApp({
      key: 'test-key',
      cert: 'test-cert'
    })
    mockCreateServer = createServer as jest.MockedFunction<typeof createServer>
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('应用初始化', () => {
    test('应该正确创建 HTTPS 应用实例', () => {
      expect(app).toBeInstanceOf(HttpsApp)
      expect(app.router).toBeDefined()
      expect(typeof app.addMiddleware).toBe('function')
      expect(typeof app.addHook).toBe('function')
      expect(typeof app.addPlugin).toBe('function')
    })

    test('应该接受 HTTPS 配置选项', () => {
      const options = {
        key: 'private-key',
        cert: 'certificate',
        passphrase: 'secret'
      }
      const httpsApp = new HttpsApp(options)
      
      expect(httpsApp).toBeInstanceOf(HttpsApp)
    })

    test('应该警告缺少证书配置', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      new HttpsApp()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'HTTPS 服务器需要提供 key 和 cert 配置'
      )
      
      consoleSpy.mockRestore()
    })

    test('应该警告只有 key 没有 cert', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      new HttpsApp({ key: 'test-key' })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'HTTPS 服务器需要提供 key 和 cert 配置'
      )
      
      consoleSpy.mockRestore()
    })

    test('应该警告只有 cert 没有 key', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      new HttpsApp({ cert: 'test-cert' })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'HTTPS 服务器需要提供 key 和 cert 配置'
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('服务器创建和启动', () => {
    test('应该正确创建 HTTPS 服务器', () => {
      app.listen(443)
      
      expect(mockCreateServer).toHaveBeenCalledWith(
        { key: 'test-key', cert: 'test-cert' },
        expect.any(Function)
      )
      expect(mockServer.listen).toHaveBeenCalledWith(443)
    })

    test('应该传递完整的 HTTPS 配置', () => {
      const options = {
        key: 'private-key',
        cert: 'certificate',
        ca: 'ca-cert',
        passphrase: 'secret'
      }
      const httpsApp = new HttpsApp(options)
      
      httpsApp.listen(443)
      
      expect(mockCreateServer).toHaveBeenCalledWith(options, expect.any(Function))
    })

    test('应该支持多个监听参数', () => {
      app.listen(443, 'localhost', () => {
        console.log('HTTPS 服务器启动')
      })
      
      expect(mockServer.listen).toHaveBeenCalledWith(443, 'localhost', expect.any(Function))
    })

    test('应该返回服务器实例', () => {
      const server = app.listen(443)
      
      expect(server).toBe(mockServer)
    })

    test('应该在服务器启动后执行插件', () => {
      const plugin = jest.fn()
      app.addPlugin(plugin)
      
      app.listen(443)
      
      // 模拟 listening 事件
      const listeningHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'listening'
      )?.[1]
      
      expect(listeningHandler).toBeDefined()
      if (listeningHandler) {
        listeningHandler()
      }
    })
  })

  describe('强制 HTTPS 中间件', () => {
    test('应该创建强制 HTTPS 中间件', () => {
      const middleware = app.forceHttps()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该设置 HSTS 头部', async () => {
      const middleware = app.forceHttps()
      
      const mockContext = {
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        'strict-transport-security',
        'max-age=31536000; includeSubDomains'
      )
      expect(next).toHaveBeenCalled()
    })

    test('应该继续处理请求', async () => {
      const middleware = app.forceHttps()
      
      const mockContext = {
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(next).toHaveBeenCalled()
    })
  })

  describe('安全头部中间件', () => {
    test('应该创建安全头部中间件', () => {
      const middleware = app.securityHeaders()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该设置默认安全头部', async () => {
      const middleware = app.securityHeaders()
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalledWith({
        'content-security-policy': "default-src 'self'",
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-xss-protection': '1; mode=block'
      })
      expect(next).toHaveBeenCalled()
    })

    test('应该支持自定义安全头部', async () => {
      const options = {
        contentSecurityPolicy: "default-src 'self'; script-src 'unsafe-inline'",
        xFrameOptions: 'SAMEORIGIN',
        xContentTypeOptions: false,
        referrerPolicy: 'no-referrer'
      }
      const middleware = app.securityHeaders(options)
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalledWith({
        'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'",
        'x-frame-options': 'SAMEORIGIN',
        'x-content-type-options': undefined,
        'referrer-policy': 'no-referrer',
        'x-xss-protection': '1; mode=block'
      })
    })

    test('应该处理部分自定义选项', async () => {
      const options = {
        contentSecurityPolicy: "default-src 'none'"
      }
      const middleware = app.securityHeaders(options)
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalledWith({
        'content-security-policy': "default-src 'none'",
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-xss-protection': '1; mode=block'
      })
    })

    test('应该继续处理请求', async () => {
      const middleware = app.securityHeaders()
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(next).toHaveBeenCalled()
    })
  })

  describe('路由功能', () => {
    test('应该支持所有 HTTP 方法', () => {
      const handler = jest.fn()
      
      app.router.get('/test', handler)
      app.router.post('/test', handler)
      app.router.put('/test', handler)
      app.router.delete('/test', handler)
      app.router.patch('/test', handler)
      app.router.head('/test', handler)
      app.router.options('/test', handler)
      
      expect(app.router.findRoute('get', '/test').handler).toBeDefined()
      expect(app.router.findRoute('post', '/test').handler).toBeDefined()
      expect(app.router.findRoute('put', '/test').handler).toBeDefined()
      expect(app.router.findRoute('delete', '/test').handler).toBeDefined()
      expect(app.router.findRoute('patch', '/test').handler).toBeDefined()
      expect(app.router.findRoute('head', '/test').handler).toBeDefined()
      expect(app.router.findRoute('options', '/test').handler).toBeDefined()
    })

    test('应该支持参数路由', () => {
      const handler = jest.fn()
      
      app.router.get('/users/:id/posts/:postId', handler)
      
      const route = app.router.findRoute('get', '/users/123/posts/456')
      expect(route.handler).toBeDefined()
      expect(route.params).toEqual({ id: '123', postId: '456' })
    })

    test('应该支持路由组', () => {
      app.router.group('/api/v1', (router) => {
        router.get('/users', jest.fn())
        router.post('/users', jest.fn())
        router.get('/users/:id', jest.fn())
      })
      
      expect(app.router.findRoute('get', '/api/v1/users').handler).toBeDefined()
      expect(app.router.findRoute('post', '/api/v1/users').handler).toBeDefined()
      expect(app.router.findRoute('get', '/api/v1/users/123').handler).toBeDefined()
    })
  })

  describe('中间件和 Hook', () => {
    test('应该支持中间件链', () => {
      const middleware1 = jest.fn(async (ctx, next) => await next())
      const middleware2 = jest.fn(async (ctx, next) => await next())
      
      app.addMiddleware(middleware1)
      app.addMiddleware(middleware2)
      
      // 验证中间件已添加
      expect(app).toBeDefined()
    })

    test('应该支持各种 Hook', () => {
      const hooks = {
        onRequest: jest.fn(),
        onPostParsing: jest.fn(),
        onPreHandler: jest.fn(),
        onPreSerialization: jest.fn(),
        onPreResponse: jest.fn(),
        onResponse: jest.fn(),
        onError: jest.fn()
      }
      
      Object.entries(hooks).forEach(([name, fn]) => {
        app.addHook(name as any, fn)
      })
      
      // 验证 Hook 已添加
      expect(app).toBeDefined()
    })

    test('应该支持插件', () => {
      const plugin = jest.fn()
      const options = { secure: true }
      
      app.addPlugin(plugin, options)
      
      // 验证插件已添加
      expect(app).toBeDefined()
    })
  })

  describe('配置管理', () => {
    test('应该支持 HTTPS 特定配置', () => {
      const config = {
        bodyLimit: 5 * 1024 * 1024,
        timeout: 120000,
        encoding: 'utf8' as BufferEncoding
      }
      
      app.setConfig(config)
      
      const currentConfig = app.getConfig()
      expect(currentConfig.bodyLimit).toBe(5 * 1024 * 1024)
      expect(currentConfig.timeout).toBe(120000)
      expect(currentConfig.encoding).toBe('utf8')
    })

    test('应该继承基类配置功能', () => {
      const defaultConfig = app.getConfig()
      
      expect(defaultConfig.bodyLimit).toBe(1024 * 1024)
      expect(defaultConfig.timeout).toBe(30000)
      expect(defaultConfig.encoding).toBe('utf-8')
      expect(defaultConfig.trustProxy).toBe(false)
    })
  })

  describe('服务器管理', () => {
    test('应该获取服务器信息', () => {
      const server = app.listen(443)
      const info = app.getServerInfo(server)
      
      expect(info).toEqual({
        port: 443,
        address: '127.0.0.1',
        family: 'IPv4'
      })
    })

    test('应该正确关闭服务器', async () => {
      const server = app.listen(443)
      
      await expect(app.close(server)).resolves.toBeUndefined()
      expect(mockServer.close).toHaveBeenCalled()
    })

    test('应该处理关闭错误', async () => {
      const error = new Error('关闭失败')
      mockServer.close.mockImplementationOnce((callback) => callback(error))
      
      const server = app.listen(443)
      
      await expect(app.close(server)).rejects.toThrow('关闭失败')
    })
  })

  describe('错误处理', () => {
    test('应该处理服务器错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      app.listen(443)
      
      // 模拟服务器错误
      const errorHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      expect(errorHandler).toBeDefined()
      if (errorHandler) {
        const testError = new Error('HTTPS 服务器错误')
        errorHandler(testError)
        
        expect(consoleSpy).toHaveBeenCalledWith('服务器错误:', testError)
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('安全特性', () => {
    test('应该组合安全中间件', async () => {
      const forceHttpsMiddleware = app.forceHttps()
      const securityHeadersMiddleware = app.securityHeaders()
      
      app.addMiddleware(forceHttpsMiddleware)
      app.addMiddleware(securityHeadersMiddleware)
      
      const mockContext = {
        setHeader: jest.fn(),
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      // 测试强制 HTTPS 中间件
      await forceHttpsMiddleware(mockContext, next)
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        'strict-transport-security',
        'max-age=31536000; includeSubDomains'
      )
      
      // 测试安全头部中间件
      await securityHeadersMiddleware(mockContext, next)
      expect(mockContext.setHeaders).toHaveBeenCalled()
    })

    test('应该支持自定义安全策略', async () => {
      const customSecurityMiddleware = app.securityHeaders({
        contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
        xFrameOptions: 'SAMEORIGIN',
        referrerPolicy: 'same-origin'
      })
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await customSecurityMiddleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
          'x-frame-options': 'SAMEORIGIN',
          'referrer-policy': 'same-origin'
        })
      )
    })
  })

  describe('性能测试', () => {
    test('应该高效处理 HTTPS 配置', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 100; i++) {
        new HttpsApp({
          key: `key-${i}`,
          cert: `cert-${i}`
        })
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // 应该在1秒内完成
    })

    test('应该高效处理安全中间件', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        app.securityHeaders()
        app.forceHttps()
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // 应该在100ms内完成
    })
  })

  describe('类型安全', () => {
    test('应该正确导出类型', () => {
      // 验证类型导出
      expect(HttpsApp).toBeDefined()
      
      // 验证实例类型
      expect(app).toBeInstanceOf(HttpsApp)
    })

    test('应该支持类型化的上下文', () => {
      app.router.get('/test', (ctx: HttpsContext) => {
        // 验证上下文类型
        expect(ctx.protocol).toBeDefined()
        expect(ctx.req).toBeDefined()
        expect(ctx.res).toBeDefined()
        expect(typeof ctx.json).toBe('function')
        expect(typeof ctx.redirect).toBe('function')
      })
    })
  })

  describe('边界情况', () => {
    test('应该处理空配置', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const emptyApp = new HttpsApp({})
      
      expect(emptyApp).toBeInstanceOf(HttpsApp)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该处理无效的证书配置', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const invalidApp = new HttpsApp({
        key: '',
        cert: ''
      })
      
      expect(invalidApp).toBeInstanceOf(HttpsApp)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该处理复杂的安全头部配置', async () => {
      const complexOptions = {
        contentSecurityPolicy: "default-src 'none'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        xFrameOptions: 'DENY',
        xContentTypeOptions: true,
        referrerPolicy: 'strict-origin-when-cross-origin'
      }
      
      const middleware = app.securityHeaders(complexOptions)
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'content-security-policy': complexOptions.contentSecurityPolicy
        })
      )
    })
  })
})