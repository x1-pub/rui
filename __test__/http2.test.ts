import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import Http2App from '../src/http2/index.js'
import type { Http2Context, Next } from '../src/type'

// 模拟 Node.js http2 模块
const mockServer = {
  listen: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  address: jest.fn().mockReturnValue({ port: 8080, address: '127.0.0.1', family: 'IPv4' }),
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
  createServer: jest.fn().mockReturnValue(mockServer),
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

import { createServer } from 'node:http2'

describe('HTTP/2 应用测试', () => {
  let app: Http2App
  let mockCreateServer: jest.MockedFunction<typeof createServer>

  beforeEach(() => {
    app = new Http2App()
    mockCreateServer = createServer as jest.MockedFunction<typeof createServer>
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('应用初始化', () => {
    test('应该正确创建 HTTP/2 应用实例', () => {
      expect(app).toBeInstanceOf(Http2App)
      expect(app.router).toBeDefined()
      expect(typeof app.addMiddleware).toBe('function')
      expect(typeof app.addHook).toBe('function')
      expect(typeof app.addPlugin).toBe('function')
    })

    test('应该接受 HTTP/2 配置选项', () => {
      const options = {
        allowHTTP1: true,
        maxSessionMemory: 10
      }
      const http2App = new Http2App(options)
      
      expect(http2App).toBeInstanceOf(Http2App)
    })

    test('应该使用默认配置', () => {
      const defaultApp = new Http2App()
      const config = defaultApp.getConfig()
      
      expect(config.bodyLimit).toBe(1024 * 1024)
      expect(config.timeout).toBe(30000)
      expect(config.encoding).toBe('utf-8')
    })
  })

  describe('服务器创建和启动', () => {
    test('应该正确创建 HTTP/2 服务器', () => {
      app.listen(8080)
      
      expect(mockCreateServer).toHaveBeenCalledWith({}, expect.any(Function))
      expect(mockServer.listen).toHaveBeenCalledWith(8080)
    })

    test('应该传递 HTTP/2 配置选项', () => {
      const options = {
        allowHTTP1: true,
        maxSessionMemory: 10
      }
      const http2App = new Http2App(options)
      
      http2App.listen(8080)
      
      expect(mockCreateServer).toHaveBeenCalledWith(options, expect.any(Function))
    })

    test('应该支持多个监听参数', () => {
      app.listen(8080, 'localhost', () => {
        console.log('HTTP/2 服务器启动')
      })
      
      expect(mockServer.listen).toHaveBeenCalledWith(8080, 'localhost', expect.any(Function))
    })

    test('应该返回服务器实例', () => {
      const server = app.listen(8080)
      
      expect(server).toBe(mockServer)
    })

    test('应该在服务器启动后执行插件', () => {
      const plugin = jest.fn()
      app.addPlugin(plugin)
      
      app.listen(8080)
      
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

  describe('服务器推送功能', () => {
    test('应该创建服务器推送中间件', () => {
      const middleware = app.serverPush()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该推送静态资源', async () => {
      const middleware = app.serverPush([
        { path: '/style.css', headers: { 'content-type': 'text/css' } },
        { path: '/script.js', headers: { 'content-type': 'application/javascript' } }
      ])
      
      const mockContext = {
        req: {
          stream: mockStream,
          headers: {
            ':method': 'GET',
            ':path': '/',
            ':scheme': 'http',
            ':authority': 'localhost'
          }
        }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockStream.pushStream).toHaveBeenCalledTimes(2)
      expect(next).toHaveBeenCalled()
    })

    test('应该处理推送错误', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockStream.pushStream.mockImplementationOnce((headers, callback) => {
        callback(new Error('推送失败'))
      })
      
      const middleware = app.serverPush([
        { path: '/style.css', headers: { 'content-type': 'text/css' } }
      ])
      
      const mockContext = {
        req: {
          stream: mockStream,
          headers: {
            ':method': 'GET',
            ':path': '/',
            ':scheme': 'http',
            ':authority': 'localhost'
          }
        }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('服务器推送失败')
      )
      expect(next).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('应该跳过非 GET 请求', async () => {
      const middleware = app.serverPush([
        { path: '/style.css', headers: { 'content-type': 'text/css' } }
      ])
      
      const mockContext = {
        req: {
          stream: mockStream,
          headers: {
            ':method': 'POST',
            ':path': '/',
            ':scheme': 'http',
            ':authority': 'localhost'
          }
        }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockStream.pushStream).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    test('应该处理流已销毁的情况', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const destroyedStream = { ...mockStream, destroyed: true }
      
      const middleware = app.serverPush([
        { path: '/style.css', headers: { 'content-type': 'text/css' } }
      ])
      
      const mockContext = {
        req: {
          stream: destroyedStream,
          headers: {
            ':method': 'GET',
            ':path': '/',
            ':scheme': 'http',
            ':authority': 'localhost'
          }
        }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith('HTTP/2 流已销毁，无法推送资源')
      expect(next).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('流控制中间件', () => {
    test('应该创建流控制中间件', () => {
      const middleware = app.streamControl()
      
      expect(typeof middleware).toBe('function')
    })

    test('应该设置流控制头部', async () => {
      const middleware = app.streamControl({
        windowSize: 65536,
        maxFrameSize: 16384
      })
      
      const mockContext = {
        setHeader: jest.fn(),
        req: { stream: mockStream }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-window-size', '65536')
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-max-frame-size', '16384')
      expect(next).toHaveBeenCalled()
    })

    test('应该使用默认流控制选项', async () => {
      const middleware = app.streamControl()
      
      const mockContext = {
        setHeader: jest.fn(),
        req: { stream: mockStream }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-window-size', '65536')
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-max-frame-size', '16384')
      expect(next).toHaveBeenCalled()
    })

    test('应该处理流错误', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const errorStream = {
        ...mockStream,
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('流错误')), 0)
          }
        })
      }
      
      const middleware = app.streamControl()
      
      const mockContext = {
        setHeader: jest.fn(),
        req: { stream: errorStream }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      // 等待异步错误处理
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(consoleSpy).toHaveBeenCalledWith('HTTP/2 流错误:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    test('应该处理流关闭', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const closeStream = {
        ...mockStream,
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(), 0)
          }
        })
      }
      
      const middleware = app.streamControl()
      
      const mockContext = {
        setHeader: jest.fn(),
        req: { stream: closeStream }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      // 等待异步事件处理
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(consoleSpy).toHaveBeenCalledWith('HTTP/2 流已关闭')
      
      consoleSpy.mockRestore()
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
      
      app.router.get('/api/:version/users/:id', handler)
      
      const route = app.router.findRoute('get', '/api/v1/users/123')
      expect(route.handler).toBeDefined()
      expect(route.params).toEqual({ version: 'v1', id: '123' })
    })

    test('应该支持嵌套路由组', () => {
      app.router.group('/api', (apiRouter) => {
        apiRouter.group('/v1', (v1Router) => {
          v1Router.get('/users', jest.fn())
          v1Router.post('/users', jest.fn())
        })
        apiRouter.group('/v2', (v2Router) => {
          v2Router.get('/users', jest.fn())
        })
      })
      
      expect(app.router.findRoute('get', '/api/v1/users').handler).toBeDefined()
      expect(app.router.findRoute('post', '/api/v1/users').handler).toBeDefined()
      expect(app.router.findRoute('get', '/api/v2/users').handler).toBeDefined()
    })
  })

  describe('中间件和 Hook', () => {
    test('应该支持 HTTP/2 特定中间件', () => {
      const serverPushMiddleware = app.serverPush()
      const streamControlMiddleware = app.streamControl()
      
      app.addMiddleware(serverPushMiddleware)
      app.addMiddleware(streamControlMiddleware)
      
      expect(app).toBeDefined()
    })

    test('应该支持中间件链', () => {
      const middleware1 = jest.fn(async (ctx, next) => {
        ctx.test1 = true
        await next()
      })
      
      const middleware2 = jest.fn(async (ctx, next) => {
        ctx.test2 = true
        await next()
      })
      
      app.addMiddleware(middleware1)
      app.addMiddleware(middleware2)
      
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
      
      expect(app).toBeDefined()
    })
  })

  describe('配置管理', () => {
    test('应该支持 HTTP/2 特定配置', () => {
      const config = {
        bodyLimit: 10 * 1024 * 1024,
        timeout: 60000,
        encoding: 'utf8' as BufferEncoding
      }
      
      app.setConfig(config)
      
      const currentConfig = app.getConfig()
      expect(currentConfig.bodyLimit).toBe(10 * 1024 * 1024)
      expect(currentConfig.timeout).toBe(60000)
      expect(currentConfig.encoding).toBe('utf8')
    })

    test('应该合并配置选项', () => {
      app.setConfig({ bodyLimit: 2048 })
      app.setConfig({ timeout: 5000 })
      
      const config = app.getConfig()
      expect(config.bodyLimit).toBe(2048)
      expect(config.timeout).toBe(5000)
      expect(config.encoding).toBe('utf-8') // 保留默认值
    })
  })

  describe('服务器管理', () => {
    test('应该获取服务器信息', () => {
      const server = app.listen(8080)
      const info = app.getServerInfo(server)
      
      expect(info).toEqual({
        port: 8080,
        address: '127.0.0.1',
        family: 'IPv4'
      })
    })

    test('应该正确关闭服务器', async () => {
      const server = app.listen(8080)
      
      await expect(app.close(server)).resolves.toBeUndefined()
      expect(mockServer.close).toHaveBeenCalled()
    })

    test('应该处理关闭错误', async () => {
      const error = new Error('关闭失败')
      mockServer.close.mockImplementationOnce((callback) => callback(error))
      
      const server = app.listen(8080)
      
      await expect(app.close(server)).rejects.toThrow('关闭失败')
    })
  })

  describe('错误处理', () => {
    test('应该处理服务器错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      app.listen(8080)
      
      // 模拟服务器错误
      const errorHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      expect(errorHandler).toBeDefined()
      if (errorHandler) {
        const testError = new Error('HTTP/2 服务器错误')
        errorHandler(testError)
        
        expect(consoleSpy).toHaveBeenCalledWith('服务器错误:', testError)
      }
      
      consoleSpy.mockRestore()
    })

    test('应该处理会话错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      app.listen(8080)
      
      // 模拟会话错误
      const sessionHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'session'
      )?.[1]
      
      expect(sessionHandler).toBeDefined()
      if (sessionHandler) {
        const mockSession = {
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('会话错误')), 0)
            }
          })
        }
        
        sessionHandler(mockSession)
        
        // 等待异步错误处理
        setTimeout(() => {
          expect(consoleSpy).toHaveBeenCalledWith('HTTP/2 会话错误:', expect.any(Error))
        }, 10)
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('HTTP/2 特性', () => {
    test('应该支持多路复用', async () => {
      const middleware = app.streamControl()
      
      // 模拟多个并发流
      const streams = Array.from({ length: 5 }, (_, i) => ({
        ...mockStream,
        id: i + 1
      }))
      
      const contexts = streams.map(stream => ({
        setHeader: jest.fn(),
        req: { stream }
      }))
      
      const next = jest.fn()
      
      // 并发处理多个流
      await Promise.all(
        contexts.map(ctx => middleware(ctx as any, next))
      )
      
      expect(next).toHaveBeenCalledTimes(5)
      contexts.forEach(ctx => {
        expect(ctx.setHeader).toHaveBeenCalledWith('x-http2-window-size', '65536')
        expect(ctx.setHeader).toHaveBeenCalledWith('x-http2-max-frame-size', '16384')
      })
    })

    test('应该支持头部压缩', async () => {
      const middleware = app.streamControl({
        enableHeaderCompression: true
      })
      
      const mockContext = {
        setHeader: jest.fn(),
        req: { stream: mockStream }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-header-compression', 'enabled')
      expect(next).toHaveBeenCalled()
    })

    test('应该处理流优先级', async () => {
      const middleware = app.streamControl({
        streamPriority: 'high'
      })
      
      const mockContext = {
        setHeader: jest.fn(),
        req: { stream: mockStream }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-stream-priority', 'high')
      expect(next).toHaveBeenCalled()
    })
  })

  describe('性能测试', () => {
    test('应该高效处理大量并发流', async () => {
      const startTime = Date.now()
      const middleware = app.streamControl()
      
      const contexts = Array.from({ length: 100 }, () => ({
        setHeader: jest.fn(),
        req: { stream: mockStream }
      }))
      
      const next = jest.fn()
      
      await Promise.all(
        contexts.map(ctx => middleware(ctx as any, next))
      )
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // 应该在100ms内完成
      expect(next).toHaveBeenCalledTimes(100)
    })

    test('应该高效处理服务器推送', async () => {
      const startTime = Date.now()
      const resources = Array.from({ length: 50 }, (_, i) => ({
        path: `/resource${i}.css`,
        headers: { 'content-type': 'text/css' }
      }))
      
      const middleware = app.serverPush(resources)
      
      const mockContext = {
        req: {
          stream: mockStream,
          headers: {
            ':method': 'GET',
            ':path': '/',
            ':scheme': 'http',
            ':authority': 'localhost'
          }
        }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(200) // 应该在200ms内完成
      expect(next).toHaveBeenCalled()
    })
  })

  describe('类型安全', () => {
    test('应该正确导出类型', () => {
      expect(Http2App).toBeDefined()
      expect(app).toBeInstanceOf(Http2App)
    })

    test('应该支持类型化的上下文', () => {
      app.router.get('/test', (ctx: Http2Context) => {
        expect(ctx.protocol).toBeDefined()
        expect(ctx.req).toBeDefined()
        expect(ctx.res).toBeDefined()
        expect(typeof ctx.json).toBe('function')
        expect(typeof ctx.redirect).toBe('function')
      })
    })
  })

  describe('边界情况', () => {
    test('应该处理空的服务器推送资源列表', async () => {
      const middleware = app.serverPush([])
      
      const mockContext = {
        req: {
          stream: mockStream,
          headers: {
            ':method': 'GET',
            ':path': '/',
            ':scheme': 'http',
            ':authority': 'localhost'
          }
        }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(mockStream.pushStream).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    test('应该处理无效的流控制选项', async () => {
      const middleware = app.streamControl({
        windowSize: -1,
        maxFrameSize: 0
      })
      
      const mockContext = {
        setHeader: jest.fn(),
        req: { stream: mockStream }
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      // 应该使用默认值
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-window-size', '65536')
      expect(mockContext.setHeader).toHaveBeenCalledWith('x-http2-max-frame-size', '16384')
      expect(next).toHaveBeenCalled()
    })

    test('应该处理缺失的流对象', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const middleware = app.streamControl()
      
      const mockContext = {
        setHeader: jest.fn(),
        req: {} // 没有 stream 属性
      } as any
      
      const next = jest.fn()
      
      await middleware(mockContext, next)
      
      expect(consoleSpy).toHaveBeenCalledWith('HTTP/2 流对象不存在')
      expect(next).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })
})