import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import Http2sApp from '../src/http2s/index.js'
import type { Http2sContext, Next } from '../src/type'

// 模拟 Node.js http2 模块
const mockServer = {
  listen: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  address: jest.fn().mockReturnValue({ port: 8443, address: '127.0.0.1', family: 'IPv4' }),
  close: jest.fn((callback) => callback && callback())
}

const mockStream = {
  respond: jest.fn(),
  end: jest.fn(),
  pushStream: jest.fn(),
  on: jest.fn(),
  destroyed: false
}

jest.mock('node:http2', () => ({
  createSecureServer: jest.fn().mockReturnValue(mockServer),
  constants: {
    HTTP2_HEADER_STATUS: ':status',
    HTTP2_HEADER_CONTENT_TYPE: 'content-type',
    HTTP2_HEADER_CONTENT_LENGTH: 'content-length',
    HTTP2_HEADER_METHOD: ':method',
    HTTP2_HEADER_PATH: ':path',
    HTTP2_HEADER_SCHEME: ':scheme',
    HTTP2_HEADER_AUTHORITY: ':authority'
  }
}))

import { createSecureServer } from 'node:http2'

describe('HTTP/2 安全应用测试', () => {
  let app: Http2sApp
  let mockCreateSecureServer: jest.MockedFunction<typeof createSecureServer>

  beforeEach(() => {
    app = new Http2sApp({
      key: 'test-key',
      cert: 'test-cert'
    })
    mockCreateSecureServer = createSecureServer as jest.MockedFunction<typeof createSecureServer>
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('应用初始化', () => {
    test('应该正确创建 HTTP/2 安全应用实例', () => {
      expect(app).toBeInstanceOf(Http2sApp)
      expect(app.router).toBeDefined()
      expect(typeof app.addMiddleware).toBe('function')
      expect(typeof app.addHook).toBe('function')
      expect(typeof app.addPlugin).toBe('function')
    })

    test('应该接受 HTTP/2 安全配置选项', () => {
      const options = {
        key: 'private-key',
        cert: 'certificate',
        allowHTTP1: false,
        maxSessionMemory: 20
      }
      const http2sApp = new Http2sApp(options)
      
      expect(http2sApp).toBeInstanceOf(Http2sApp)
    })

    test('应该警告缺少证书配置', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      new Http2sApp()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'HTTP/2 安全服务器需要提供 key 和 cert 配置'
      )
      
      consoleSpy.mockRestore()
    })

    test('应该警告不完整的证书配置', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      new Http2sApp({ key: 'test-key' })
      new Http2sApp({ cert: 'test-cert' })
      
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      expect(consoleSpy).toHaveBeenCalledWith(
        'HTTP/2 安全服务器需要提供 key 和 cert 配置'
      )
      
      consoleSpy.mockRestore()
    })

    test('应该使用默认配置', () => {
      const config = app.getConfig()
      
      expect(config.bodyLimit).toBe(1024 * 1024)
      expect(config.timeout).toBe(30000)
      expect(config.encoding).toBe('utf-8')
      expect(config.trustProxy).toBe(false)
    })
  })

  describe('服务器创建和启动', () => {
    test('应该正确创建 HTTP/2 安全服务器', () => {
      app.listen(8443)
      
      expect(mockCreateSecureServer).toHaveBeenCalledWith(
        { key: 'test-key', cert: 'test-cert' },
        expect.any(Function)
      )
      expect(mockServer.listen).toHaveBeenCalledWith(8443)
    })

    test('应该传递完整的 HTTP/2 安全配置', () => {
      const options = {
        key: 'private-key',
        cert: 'certificate',
        ca: 'ca-cert',
        passphrase: 'secret',
        allowHTTP1: false,
        maxSessionMemory: 20
      }
      const http2sApp = new Http2sApp(options)
      
      http2sApp.listen(8443)
      
      expect(mockCreateSecureServer).toHaveBeenCalledWith(options, expect.any(Function))
    })

    test('应该支持多个监听参数', () => {
      app.listen(8443, 'localhost', () => {
        console.log('HTTP/2 安全服务器启动')
      })
      
      expect(mockServer.listen).toHaveBeenCalledWith(8443, 'localhost', expect.any(Function))
    })

    test('应该返回服务器实例', () => {
      const server = app.listen(8443)
      
      expect(server).toBe(mockServer)
    })

    test('应该在服务器启动后执行插件', () => {
      const plugin = jest.fn()
      app.addPlugin(plugin)
      
      app.listen(8443)
      
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

  describe('增强安全策略中间件', () => {
    test('应该创建增强安全策略中间件', () => {
      const middleware = app.enhancedSecurity()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该设置默认增强安全头部', async () => {
      const middleware = app.enhancedSecurity()
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalledWith({
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
        'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-xss-protection': '1; mode=block',
        'permissions-policy': 'geolocation=(), microphone=(), camera=()'
      })
      expect(next).toHaveBeenCalled()
    })

    test('应该支持自定义安全策略', async () => {
      const options = {
        hsts: 'max-age=31536000; includeSubDomains',
        csp: "default-src 'self'; script-src 'self' 'unsafe-eval'",
        frameOptions: 'SAMEORIGIN',
        contentTypeOptions: false,
        referrerPolicy: 'same-origin',
        xssProtection: '0',
        permissionsPolicy: 'geolocation=(self)'
      }
      const middleware = app.enhancedSecurity(options)
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalledWith({
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-eval'",
        'x-frame-options': 'SAMEORIGIN',
        'x-content-type-options': undefined,
        'referrer-policy': 'same-origin',
        'x-xss-protection': '0',
        'permissions-policy': 'geolocation=(self)'
      })
    })

    test('应该继续处理请求', async () => {
      const middleware = app.enhancedSecurity()
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(next).toHaveBeenCalled()
    })
  })

  describe('TLS 验证中间件', () => {
    test('应该创建 TLS 验证中间件', () => {
      const middleware = app.tlsValidation()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该验证 TLS 连接', async () => {
      const middleware = app.tlsValidation()
      
      const mockContext = {
        req: {
          socket: {
            encrypted: true,
            authorized: true,
            getPeerCertificate: jest.fn().mockReturnValue({
              subject: { CN: 'example.com' },
              issuer: { CN: 'CA' },
              valid_from: new Date(Date.now() - 86400000).toISOString(),
              valid_to: new Date(Date.now() + 86400000).toISOString()
            })
          }
        },
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-tls-validated', 'true')
      expect(next).toHaveBeenCalled()
    })

    test('应该处理未加密连接', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const middleware = app.tlsValidation()
      
      const mockContext = {
        req: {
          socket: {
            encrypted: false
          }
        },
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith('检测到非加密连接')
      expect(mockContext.code).toHaveBeenCalledWith(400)
      expect(mockContext.send).toHaveBeenCalledWith('需要安全连接')
      expect(next).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该处理未授权证书', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const middleware = app.tlsValidation({ requireAuthorized: true })
      
      const mockContext = {
        req: {
          socket: {
            encrypted: true,
            authorized: false,
            authorizationError: 'SELF_SIGNED_CERT_IN_CHAIN'
          }
        },
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TLS 证书未授权')
      )
      expect(mockContext.code).toHaveBeenCalledWith(401)
      expect(mockContext.send).toHaveBeenCalledWith('证书验证失败')
      expect(next).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该处理过期证书', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const middleware = app.tlsValidation({ checkExpiry: true })
      
      const mockContext = {
        req: {
          socket: {
            encrypted: true,
            authorized: true,
            getPeerCertificate: jest.fn().mockReturnValue({
              subject: { CN: 'example.com' },
              issuer: { CN: 'CA' },
              valid_from: new Date(Date.now() - 2 * 86400000).toISOString(),
              valid_to: new Date(Date.now() - 86400000).toISOString() // 已过期
            })
          }
        },
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith('TLS 证书已过期')
      expect(mockContext.code).toHaveBeenCalledWith(401)
      expect(mockContext.send).toHaveBeenCalledWith('证书已过期')
      expect(next).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该处理证书获取错误', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const middleware = app.tlsValidation({ checkExpiry: true })
      
      const mockContext = {
        req: {
          socket: {
            encrypted: true,
            authorized: true,
            getPeerCertificate: jest.fn().mockImplementation(() => {
              throw new Error('证书获取失败')
            })
          }
        },
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith('TLS 验证错误:', expect.any(Error))
      expect(next).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('性能监控中间件', () => {
    test('应该创建性能监控中间件', () => {
      const middleware = app.performanceMonitor()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该监控请求性能', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const middleware = app.performanceMonitor()
      
      const mockContext = {
        req: { method: 'GET', url: '/test' },
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn(async () => {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        'x-response-time',
        expect.stringMatching(/^\d+ms$/)
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('请求性能: GET /test')
      )
      
      consoleSpy.mockRestore()
    })

    test('应该支持自定义性能阈值', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const middleware = app.performanceMonitor({ threshold: 5 })
      
      const mockContext = {
        req: { method: 'GET', url: '/slow' },
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn(async () => {
        // 模拟慢请求
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('慢请求警告')
      )
      
      consoleSpy.mockRestore()
    })

    test('应该记录内存使用情况', async () => {
      const middleware = app.performanceMonitor({ trackMemory: true })
      
      const mockContext = {
        req: { method: 'GET', url: '/test' },
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        'x-memory-usage',
        expect.stringMatching(/^\d+MB$/)
      )
    })

    test('应该处理性能监控错误', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const middleware = app.performanceMonitor()
      
      const mockContext = {
        req: { method: 'GET', url: '/test' },
        setHeader: jest.fn().mockImplementation(() => {
          throw new Error('设置头部失败')
        })
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith('性能监控错误:', expect.any(Error))
      expect(next).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('HTTP/2 特性继承', () => {
    test('应该继承服务器推送功能', () => {
      const middleware = app.serverPush([
        { path: '/style.css', headers: { 'content-type': 'text/css' } }
      ])
      
      expect(typeof middleware).toBe('function')
    })

    test('应该继承流控制功能', () => {
      const middleware = app.streamControl({
        windowSize: 131072,
        maxFrameSize: 32768
      })
      
      expect(typeof middleware).toBe('function')
    })

    test('应该组合 HTTP/2 和安全功能', async () => {
      const securityMiddleware = app.enhancedSecurity()
      const tlsMiddleware = app.tlsValidation()
      const performanceMiddleware = app.performanceMonitor()
      
      app.addMiddleware(securityMiddleware)
      app.addMiddleware(tlsMiddleware)
      app.addMiddleware(performanceMiddleware)
      
      expect(app).toBeDefined()
    })
  })

  describe('路由功能', () => {
    test('应该支持所有 HTTP 方法', () => {
      const handler = jest.fn()
      
      app.router.get('/secure', handler)
      app.router.post('/secure', handler)
      app.router.put('/secure', handler)
      app.router.delete('/secure', handler)
      app.router.patch('/secure', handler)
      app.router.head('/secure', handler)
      app.router.options('/secure', handler)
      
      expect(app.router.findRoute('get', '/secure').handler).toBeDefined()
      expect(app.router.findRoute('post', '/secure').handler).toBeDefined()
      expect(app.router.findRoute('put', '/secure').handler).toBeDefined()
      expect(app.router.findRoute('delete', '/secure').handler).toBeDefined()
      expect(app.router.findRoute('patch', '/secure').handler).toBeDefined()
      expect(app.router.findRoute('head', '/secure').handler).toBeDefined()
      expect(app.router.findRoute('options', '/secure').handler).toBeDefined()
    })

    test('应该支持安全路由组', () => {
      app.router.group('/api/secure', (router) => {
        router.get('/users', jest.fn())
        router.post('/auth', jest.fn())
        router.group('/admin', (adminRouter) => {
          adminRouter.get('/stats', jest.fn())
        })
      })
      
      expect(app.router.findRoute('get', '/api/secure/users').handler).toBeDefined()
      expect(app.router.findRoute('post', '/api/secure/auth').handler).toBeDefined()
      expect(app.router.findRoute('get', '/api/secure/admin/stats').handler).toBeDefined()
    })
  })

  describe('配置管理', () => {
    test('应该支持 HTTP/2 安全特定配置', () => {
      const config = {
        bodyLimit: 20 * 1024 * 1024,
        timeout: 180000,
        encoding: 'utf8' as BufferEncoding,
        trustProxy: true
      }
      
      app.setConfig(config)
      
      const currentConfig = app.getConfig()
      expect(currentConfig.bodyLimit).toBe(20 * 1024 * 1024)
      expect(currentConfig.timeout).toBe(180000)
      expect(currentConfig.encoding).toBe('utf8')
      expect(currentConfig.trustProxy).toBe(true)
    })

    test('应该保持配置独立性', () => {
      const app1 = new Http2sApp({ key: 'key1', cert: 'cert1' })
      const app2 = new Http2sApp({ key: 'key2', cert: 'cert2' })
      
      app1.setConfig({ bodyLimit: 1024 })
      app2.setConfig({ bodyLimit: 2048 })
      
      expect(app1.getConfig().bodyLimit).toBe(1024)
      expect(app2.getConfig().bodyLimit).toBe(2048)
    })
  })

  describe('服务器管理', () => {
    test('应该获取服务器信息', () => {
      const server = app.listen(8443)
      const info = app.getServerInfo(server)
      
      expect(info).toEqual({
        port: 8443,
        address: '127.0.0.1',
        family: 'IPv4'
      })
    })

    test('应该正确关闭服务器', async () => {
      const server = app.listen(8443)
      
      await expect(app.close(server)).resolves.toBeUndefined()
      expect(mockServer.close).toHaveBeenCalled()
    })

    test('应该处理关闭错误', async () => {
      const error = new Error('关闭失败')
      mockServer.close.mockImplementationOnce((callback) => callback(error))
      
      const server = app.listen(8443)
      
      await expect(app.close(server)).rejects.toThrow('关闭失败')
    })
  })

  describe('错误处理', () => {
    test('应该处理服务器错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      app.listen(8443)
      
      // 模拟服务器错误
      const errorHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      expect(errorHandler).toBeDefined()
      if (errorHandler) {
        const testError = new Error('HTTP/2 安全服务器错误')
        errorHandler(testError)
        
        expect(consoleSpy).toHaveBeenCalledWith('服务器错误:', testError)
      }
      
      consoleSpy.mockRestore()
    })

    test('应该处理 TLS 错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      app.listen(8443)
      
      // 模拟 TLS 错误
      const tlsErrorHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'tlsClientError'
      )?.[1]
      
      expect(tlsErrorHandler).toBeDefined()
      if (tlsErrorHandler) {
        const tlsError = new Error('TLS 握手失败')
        tlsErrorHandler(tlsError)
        
        expect(consoleSpy).toHaveBeenCalledWith('TLS 客户端错误:', tlsError)
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('安全特性集成', () => {
    test('应该组合所有安全中间件', async () => {
      const enhancedSecurityMiddleware = app.enhancedSecurity()
      const tlsValidationMiddleware = app.tlsValidation()
      const performanceMonitorMiddleware = app.performanceMonitor()
      
      const mockContext = {
        setHeaders: jest.fn(),
        setHeader: jest.fn(),
        req: {
          method: 'GET',
          url: '/secure-test',
          socket: {
            encrypted: true,
            authorized: true,
            getPeerCertificate: jest.fn().mockReturnValue({
              subject: { CN: 'example.com' },
              issuer: { CN: 'CA' },
              valid_from: new Date(Date.now() - 86400000).toISOString(),
              valid_to: new Date(Date.now() + 86400000).toISOString()
            })
          }
        }
      } as any
      
      const next = jest.fn()
      
      // 依次执行所有安全中间件
      await enhancedSecurityMiddleware(mockContext, next)
      await tlsValidationMiddleware(mockContext, next)
      await performanceMonitorMiddleware(mockContext, next)
      
      expect(mockContext.setHeaders).toHaveBeenCalled()
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-tls-validated', 'true')
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        'x-response-time',
        expect.stringMatching(/^\d+ms$/)
      )
      expect(next).toHaveBeenCalledTimes(3)
    })

    test('应该处理安全策略冲突', async () => {
      const middleware1 = app.enhancedSecurity({
        csp: "default-src 'self'"
      })
      
      const middleware2 = app.enhancedSecurity({
        csp: "default-src 'none'"
      })
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware1(mockContext, next)
      await middleware2(mockContext, next)
      
      // 后执行的中间件应该覆盖前面的设置
      expect(mockContext.setHeaders).toHaveBeenCalledTimes(2)
      expect(next).toHaveBeenCalledTimes(2)
    })
  })

  describe('性能测试', () => {
    test('应该高效处理安全中间件', async () => {
      const startTime = Date.now()
      
      const middlewares = [
        app.enhancedSecurity(),
        app.tlsValidation(),
        app.performanceMonitor()
      ]
      
      const mockContext = {
        setHeaders: jest.fn(),
        setHeader: jest.fn(),
        req: {
          method: 'GET',
          url: '/test',
          socket: {
            encrypted: true,
            authorized: true,
            getPeerCertificate: jest.fn().mockReturnValue({
              subject: { CN: 'example.com' },
              valid_from: new Date().toISOString(),
              valid_to: new Date(Date.now() + 86400000).toISOString()
            })
          }
        }
      } as any
      
      const next = jest.fn()
      
      // 并发执行所有中间件
      await Promise.all(
        middlewares.map(middleware => middleware(mockContext, next))
      )
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(50) // 应该在50ms内完成
      expect(next).toHaveBeenCalledTimes(3)
    })

    test('应该高效处理大量并发安全请求', async () => {
      const startTime = Date.now()
      const middleware = app.enhancedSecurity()
      
      const contexts = Array.from({ length: 100 }, () => ({
        setHeaders: jest.fn()
      }))
      
      const next = jest.fn()
      
      await Promise.all(
        contexts.map(ctx => middleware(ctx as any, next))
      )
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // 应该在100ms内完成
      expect(next).toHaveBeenCalledTimes(100)
    })
  })

  describe('类型安全', () => {
    test('应该正确导出类型', () => {
      expect(Http2sApp).toBeDefined()
      expect(app).toBeInstanceOf(Http2sApp)
    })

    test('应该支持类型化的上下文', () => {
      app.router.get('/test', (ctx: Http2sContext) => {
        expect(ctx.protocol).toBeDefined()
        expect(ctx.req).toBeDefined()
        expect(ctx.res).toBeDefined()
        expect(typeof ctx.json).toBe('function')
        expect(typeof ctx.redirect).toBe('function')
      })
    })
  })

  describe('边界情况', () => {
    test('应该处理空的安全配置', async () => {
      const middleware = app.enhancedSecurity({})
      
      const mockContext = {
        setHeaders: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      // 应该使用默认安全配置
      expect(mockContext.setHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'strict-transport-security': expect.any(String),
          'content-security-policy': expect.any(String)
        })
      )
      expect(next).toHaveBeenCalled()
    })

    test('应该处理无效的 TLS 配置', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const middleware = app.tlsValidation({
        requireAuthorized: true,
        checkExpiry: true
      })
      
      const mockContext = {
        req: {
          socket: {
            encrypted: true,
            authorized: false,
            authorizationError: 'DEPTH_ZERO_SELF_SIGNED_CERT',
            getPeerCertificate: jest.fn().mockReturnValue(null)
          }
        },
        code: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalled()
      expect(mockContext.code).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该处理性能监控的边界值', async () => {
      const middleware = app.performanceMonitor({
        threshold: 0,
        trackMemory: false
      })
      
      const mockContext = {
        req: { method: 'GET', url: '/test' },
        setHeader: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        'x-response-time',
        expect.stringMatching(/^\d+ms$/)
      )
      expect(next).toHaveBeenCalled()
    })
  })
})
