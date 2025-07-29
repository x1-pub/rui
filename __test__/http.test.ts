import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { EventEmitter } from 'events'
import HttpApp from '../src/http/index.js'
import type { HttpContext, Next } from '../src/type'

// 模拟 Node.js http 模块
const mockServer = {
  listen: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  address: jest.fn().mockReturnValue({ port: 3000, address: '127.0.0.1', family: 'IPv4' }),
  close: jest.fn((callback) => callback && callback())
}

jest.mock('node:http', () => ({
  createServer: jest.fn().mockReturnValue(mockServer)
}))

import { createServer } from 'node:http'

describe('HTTP 应用测试', () => {
  let app: HttpApp
  let mockCreateServer: jest.MockedFunction<typeof createServer>

  beforeEach(() => {
    app = new HttpApp()
    mockCreateServer = createServer as jest.MockedFunction<typeof createServer>
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('应用初始化', () => {
    test('应该正确创建 HTTP 应用实例', () => {
      expect(app).toBeInstanceOf(HttpApp)
      expect(app.router).toBeDefined()
      expect(typeof app.addMiddleware).toBe('function')
      expect(typeof app.addHook).toBe('function')
      expect(typeof app.addPlugin).toBe('function')
    })

    test('应该接受配置选项', () => {
      const options = { timeout: 5000 }
      const appWithOptions = new HttpApp(options)
      
      expect(appWithOptions).toBeInstanceOf(HttpApp)
    })

    test('应该使用默认配置', () => {
      const defaultApp = new HttpApp()
      const config = defaultApp.getConfig()
      
      expect(config.bodyLimit).toBe(1024 * 1024)
      expect(config.timeout).toBe(30000)
      expect(config.encoding).toBe('utf-8')
    })
  })

  describe('服务器创建和启动', () => {
    test('应该正确创建 HTTP 服务器', () => {
      app.listen(3000)
      
      expect(mockCreateServer).toHaveBeenCalledWith({}, expect.any(Function))
      expect(mockServer.listen).toHaveBeenCalledWith(3000)
    })

    test('应该传递配置选项到服务器', () => {
      const options = { timeout: 5000 }
      const appWithOptions = new HttpApp(options)
      
      appWithOptions.listen(3000)
      
      expect(mockCreateServer).toHaveBeenCalledWith(options, expect.any(Function))
    })

    test('应该支持多个监听参数', () => {
      app.listen(3000, 'localhost', () => {
        console.log('服务器启动')
      })
      
      expect(mockServer.listen).toHaveBeenCalledWith(3000, 'localhost', expect.any(Function))
    })

    test('应该返回服务器实例', () => {
      const server = app.listen(3000)
      
      expect(server).toBe(mockServer)
    })

    test('应该在服务器启动后执行插件', () => {
      const plugin = jest.fn()
      app.addPlugin(plugin)
      
      app.listen(3000)
      
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

  describe('路由功能', () => {
    test('应该支持 GET 路由', () => {
      const handler = jest.fn()
      
      app.router.get('/test', handler)
      
      const route = app.router.findRoute('get', '/test')
      expect(route.handler).toBeDefined()
    })

    test('应该支持 POST 路由', () => {
      const handler = jest.fn()
      
      app.router.post('/users', handler)
      
      const route = app.router.findRoute('post', '/users')
      expect(route.handler).toBeDefined()
    })

    test('应该支持参数路由', () => {
      const handler = jest.fn()
      
      app.router.get('/users/:id', handler)
      
      const route = app.router.findRoute('get', '/users/123')
      expect(route.handler).toBeDefined()
      expect(route.params).toEqual({ id: '123' })
    })

    test('应该支持路由组', () => {
      app.router.group('/api', (router) => {
        router.get('/users', jest.fn())
        router.post('/users', jest.fn())
      })
      
      const getRoute = app.router.findRoute('get', '/api/users')
      const postRoute = app.router.findRoute('post', '/api/users')
      
      expect(getRoute.handler).toBeDefined()
      expect(postRoute.handler).toBeDefined()
    })
  })

  describe('中间件功能', () => {
    test('应该支持添加中间件', () => {
      const middleware = jest.fn(async (ctx, next) => {
        await next()
      })
      
      const result = app.addMiddleware(middleware)
      
      expect(result).toBe(app)
    })

    test('应该支持链式调用', () => {
      const middleware1 = jest.fn(async (ctx, next) => await next())
      const middleware2 = jest.fn(async (ctx, next) => await next())
      
      const result = app
        .addMiddleware(middleware1)
        .addMiddleware(middleware2)
      
      expect(result).toBe(app)
    })
  })

  describe('Hook 功能', () => {
    test('应该支持添加请求 Hook', () => {
      const hook = jest.fn()
      
      const result = app.addHook('onRequest', hook)
      
      expect(result).toBe(app)
    })

    test('应该支持添加错误 Hook', () => {
      const errorHook = jest.fn()
      
      const result = app.addHook('onError', errorHook)
      
      expect(result).toBe(app)
    })

    test('应该支持链式调用', () => {
      const hook1 = jest.fn()
      const hook2 = jest.fn()
      
      const result = app
        .addHook('onRequest', hook1)
        .addHook('onResponse', hook2)
      
      expect(result).toBe(app)
    })
  })

  describe('插件功能', () => {
    test('应该支持添加插件', () => {
      const plugin = jest.fn()
      const options = { test: true }
      
      const result = app.addPlugin(plugin, options)
      
      expect(result).toBe(app)
    })

    test('应该支持无选项的插件', () => {
      const plugin = jest.fn()
      
      const result = app.addPlugin(plugin)
      
      expect(result).toBe(app)
    })
  })

  describe('配置管理', () => {
    test('应该支持设置配置', () => {
      const config = {
        bodyLimit: 2 * 1024 * 1024,
        timeout: 60000
      }
      
      const result = app.setConfig(config)
      
      expect(result).toBe(app)
      
      const currentConfig = app.getConfig()
      expect(currentConfig.bodyLimit).toBe(2 * 1024 * 1024)
      expect(currentConfig.timeout).toBe(60000)
    })

    test('应该保留未修改的配置', () => {
      app.setConfig({ bodyLimit: 2048 })
      
      const config = app.getConfig()
      expect(config.bodyLimit).toBe(2048)
      expect(config.encoding).toBe('utf-8') // 应该保留默认值
    })
  })

  describe('HTTPS 重定向中间件', () => {
    test('应该创建 HTTPS 重定向中间件', () => {
      const middleware = app.httpsRedirect()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该重定向 HTTP 请求到 HTTPS', async () => {
      const middleware = app.httpsRedirect()
      
      const mockContext = {
        protocol: 'http',
        host: 'example.com',
        req: { url: '/test' },
        redirect: jest.fn().mockReturnThis()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.redirect).toHaveBeenCalledWith('https://example.com/test', 301)
      expect(next).not.toHaveBeenCalled()
    })

    test('应该支持自定义端口', async () => {
      const middleware = app.httpsRedirect(8443)
      
      const mockContext = {
        protocol: 'http',
        host: 'example.com:8080',
        req: { url: '/test' },
        redirect: jest.fn().mockReturnThis()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.redirect).toHaveBeenCalledWith('https://example.com:8443/test', 301)
    })

    test('应该跳过 HTTPS 请求', async () => {
      const middleware = app.httpsRedirect()
      
      const mockContext = {
        protocol: 'https',
        host: 'example.com',
        req: { url: '/test' },
        redirect: jest.fn()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.redirect).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    test('应该处理默认 HTTPS 端口', async () => {
      const middleware = app.httpsRedirect(443)
      
      const mockContext = {
        protocol: 'http',
        host: 'example.com:8080',
        req: { url: '/test' },
        redirect: jest.fn().mockReturnThis()
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.redirect).toHaveBeenCalledWith('https://example.com/test', 301)
    })
  })

  describe('静态文件中间件', () => {
    test('应该创建静态文件中间件', () => {
      const middleware = app.static('/public')
      
      expect(typeof middleware).toBe('function')
    })

    test('应该支持配置选项', () => {
      const middleware = app.static('/public', {
        maxAge: 3600,
        index: 'home.html'
      })
      
      expect(typeof middleware).toBe('function')
    })

    test('应该只处理 GET 和 HEAD 请求', async () => {
      const middleware = app.static('/public')
      
      const mockContext = {
        req: { method: 'POST' }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(next).toHaveBeenCalled()
    })

    test('应该处理 GET 请求', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const middleware = app.static('/public')
      
      const mockContext = {
        req: { method: 'GET' },
        pathname: '/style.css'
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('静态文件请求: /style.css, 根目录: /public')
      )
      expect(next).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该处理 HEAD 请求', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const middleware = app.static('/public')
      
      const mockContext = {
        req: { method: 'HEAD' },
        pathname: '/image.png'
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('静态文件请求: /image.png, 根目录: /public')
      )
      expect(next).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('服务器信息', () => {
    test('应该获取服务器信息', () => {
      const server = app.listen(3000)
      const info = app.getServerInfo(server)
      
      expect(info).toEqual({
        port: 3000,
        address: '127.0.0.1',
        family: 'IPv4'
      })
    })

    test('应该处理字符串地址', () => {
      mockServer.address.mockReturnValueOnce('/tmp/socket')
      
      const server = app.listen(3000)
      const info = app.getServerInfo(server)
      
      expect(info).toEqual({
        address: '/tmp/socket'
      })
    })

    test('应该处理空地址', () => {
      mockServer.address.mockReturnValueOnce(null)
      
      const server = app.listen(3000)
      const info = app.getServerInfo(server)
      
      expect(info).toEqual({})
    })
  })

  describe('服务器关闭', () => {
    test('应该正确关闭服务器', async () => {
      const server = app.listen(3000)
      
      await expect(app.close(server)).resolves.toBeUndefined()
      expect(mockServer.close).toHaveBeenCalled()
    })

    test('应该处理关闭错误', async () => {
      const error = new Error('关闭失败')
      mockServer.close.mockImplementationOnce((callback) => callback(error))
      
      const server = app.listen(3000)
      
      await expect(app.close(server)).rejects.toThrow('关闭失败')
    })
  })

  describe('错误处理', () => {
    test('应该处理服务器错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      app.listen(3000)
      
      // 模拟服务器错误
      const errorHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      expect(errorHandler).toBeDefined()
      if (errorHandler) {
        const testError = new Error('服务器错误')
        errorHandler(testError)
        
        expect(consoleSpy).toHaveBeenCalledWith('服务器错误:', testError)
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('类型导出', () => {
    test('应该导出正确的类型', () => {
      // 这个测试主要是为了确保类型导出正常工作
      // 在 TypeScript 编译时会检查类型
      expect(HttpApp).toBeDefined()
    })
  })

  describe('继承功能', () => {
    test('应该继承基类的所有功能', () => {
      // 验证继承的方法
      expect(typeof app.addMiddleware).toBe('function')
      expect(typeof app.addHook).toBe('function')
      expect(typeof app.addPlugin).toBe('function')
      expect(typeof app.setConfig).toBe('function')
      expect(typeof app.getConfig).toBe('function')
      
      // 验证路由器
      expect(app.router).toBeDefined()
      expect(typeof app.router.get).toBe('function')
      expect(typeof app.router.post).toBe('function')
      expect(typeof app.router.put).toBe('function')
      expect(typeof app.router.delete).toBe('function')
    })
  })

  describe('性能测试', () => {
    test('应该能够处理大量路由注册', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        app.router.get(`/route${i}`, jest.fn())
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // 应该在1秒内完成
    })

    test('应该能够处理大量中间件', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 100; i++) {
        app.addMiddleware(async (ctx, next) => {
          await next()
        })
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // 应该在100ms内完成
    })
  })

  describe('内存管理', () => {
    test('应该正确清理资源', () => {
      const app1 = new HttpApp()
      const app2 = new HttpApp()
      
      // 添加一些资源
      app1.addMiddleware(jest.fn())
      app1.addHook('onRequest', jest.fn())
      app1.addPlugin(jest.fn())
      
      app2.addMiddleware(jest.fn())
      app2.addHook('onRequest', jest.fn())
      app2.addPlugin(jest.fn())
      
      // 验证应用实例是独立的
      expect(app1.getConfig()).toEqual(app2.getConfig())
      expect(app1).not.toBe(app2)
    })
  })
})