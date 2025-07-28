import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { EventEmitter } from 'events'
import App from '../src/core/index.js'
import { RuiError } from '../src/error/index.js'
import type { CommonRequest, CommonResponse, Context, Middleware } from '../src/type'

// 模拟请求和响应对象
class MockRequest extends EventEmitter {
  method = 'GET'
  url = '/'
  headers: Record<string, string | string[]> = {}
  socket = {
    remoteAddress: '127.0.0.1',
    encrypted: false
  }
}

class MockResponse extends EventEmitter {
  statusCode = 200
  writable = true
  writableEnded = false
  private headers: Record<string, string | string[]> = {}

  setHeader(name: string, value: string | string[]) {
    this.headers[name.toLowerCase()] = value
  }

  getHeader(name: string) {
    return this.headers[name.toLowerCase()]
  }

  end(data?: any) {
    this.writableEnded = true
    this.emit('finish')
  }
}

// 测试用的 App 实现
class TestApp extends App<any, any> {
  public testCallback = this.callback
  public testExecutePlugins = this.executePlugins
}

describe('核心 App 类测试', () => {
  let app: TestApp
  let req: MockRequest
  let res: MockResponse

  beforeEach(() => {
    app = new TestApp()
    req = new MockRequest()
    res = new MockResponse()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('初始化', () => {
    test('应该正确初始化 App 实例', () => {
      expect(app).toBeInstanceOf(App)
      expect(app.router).toBeDefined()
      expect(typeof app.addMiddleware).toBe('function')
      expect(typeof app.addHook).toBe('function')
      expect(typeof app.addPlugin).toBe('function')
    })

    test('应该正确设置默认配置', () => {
      const config = app.getConfig()
      expect(config.bodyLimit).toBe(1024 * 1024)
      expect(config.timeout).toBe(30000)
      expect(config.encoding).toBe('utf-8')
      expect(config.trustProxy).toBe(false)
    })
  })

  describe('中间件管理', () => {
    test('应该正确添加中间件', () => {
      const middleware: Middleware<MockRequest, MockResponse> = async (ctx, next) => {
        await next()
      }

      const result = app.addMiddleware(middleware)
      expect(result).toBe(app) // 应该返回 this 以支持链式调用
    })

    test('应该拒绝非函数中间件', () => {
      expect(() => {
        app.addMiddleware('not a function' as any)
      }).toThrow(RuiError)
    })

    test('addMiddlewares 应该是 addMiddleware 的别名', () => {
      expect(app.addMiddlewares).toBe(app.addMiddleware)
    })
  })

  describe('Hook 管理', () => {
    test('应该正确添加普通 Hook', () => {
      const hookFn = jest.fn()
      const result = app.addHook('onRequest', hookFn)
      
      expect(result).toBe(app)
    })

    test('应该正确添加错误 Hook', () => {
      const errorHookFn = jest.fn()
      const result = app.addHook('onError', errorHookFn)
      
      expect(result).toBe(app)
    })

    test('应该拒绝非函数 Hook', () => {
      expect(() => {
        app.addHook('onRequest', 'not a function' as any)
      }).toThrow(RuiError)
    })

    test('应该拒绝未知的 Hook 名称', () => {
      expect(() => {
        app.addHook('unknownHook' as any, jest.fn())
      }).toThrow(RuiError)
    })
  })

  describe('插件管理', () => {
    test('应该正确添加插件', () => {
      const plugin = jest.fn()
      const options = { test: true }
      
      const result = app.addPlugin(plugin, options)
      expect(result).toBe(app)
    })

    test('应该使用默认选项添加插件', () => {
      const plugin = jest.fn()
      
      const result = app.addPlugin(plugin)
      expect(result).toBe(app)
    })

    test('应该拒绝非函数插件', () => {
      expect(() => {
        app.addPlugin('not a function' as any)
      }).toThrow(RuiError)
    })

    test('应该正确执行插件', async () => {
      const plugin = jest.fn().mockResolvedValue(undefined)
      const options = { test: true }
      
      app.addPlugin(plugin, options)
      await app.testExecutePlugins()
      
      expect(plugin).toHaveBeenCalledWith(app, options)
    })

    test('应该处理插件执行错误', async () => {
      const plugin = jest.fn().mockRejectedValue(new Error('插件错误'))
      
      app.addPlugin(plugin)
      
      await expect(app.testExecutePlugins()).rejects.toThrow('插件错误')
    })
  })

  describe('配置管理', () => {
    test('应该正确设置配置', () => {
      const newConfig = {
        bodyLimit: 2 * 1024 * 1024,
        timeout: 60000
      }
      
      const result = app.setConfig(newConfig)
      expect(result).toBe(app)
      
      const config = app.getConfig()
      expect(config.bodyLimit).toBe(2 * 1024 * 1024)
      expect(config.timeout).toBe(60000)
      expect(config.encoding).toBe('utf-8') // 应该保留原有配置
    })

    test('应该返回配置副本', () => {
      const config1 = app.getConfig()
      const config2 = app.getConfig()
      
      expect(config1).toEqual(config2)
      expect(config1).not.toBe(config2) // 应该是不同的对象
    })
  })

  describe('请求处理', () => {
    test('应该正确处理简单请求', async () => {
      // 添加路由
      app.router.get('/', (ctx) => {
        ctx.send('Hello World')
      })

      await app.testCallback(req, res)

      expect(res.statusCode).toBe(200)
      expect(res.writableEnded).toBe(true)
    })

    test('应该正确执行中间件链', async () => {
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
      
      app.router.get('/', (ctx) => {
        expect(ctx.test1).toBe(true)
        expect(ctx.test2).toBe(true)
        ctx.send('OK')
      })

      await app.testCallback(req, res)

      expect(middleware1).toHaveBeenCalled()
      expect(middleware2).toHaveBeenCalled()
    })

    test('应该正确执行 Hook', async () => {
      const onRequestHook = jest.fn()
      const onResponseHook = jest.fn()

      app.addHook('onRequest', onRequestHook)
      app.addHook('onResponse', onResponseHook)
      
      app.router.get('/', (ctx) => {
        ctx.send('OK')
      })

      await app.testCallback(req, res)

      expect(onRequestHook).toHaveBeenCalled()
      // onResponse 在 finish 事件后触发，需要等待
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(onResponseHook).toHaveBeenCalled()
    })

    test('应该正确处理路由参数', async () => {
      app.router.get('/users/:id', (ctx) => {
        expect(ctx.params.id).toBe('123')
        ctx.send('User 123')
      })

      req.url = '/users/123'
      await app.testCallback(req, res)

      expect(res.statusCode).toBe(200)
    })

    test('应该正确处理查询参数', async () => {
      app.router.get('/search', (ctx) => {
        expect(ctx.query.q).toBe('test')
        expect(ctx.query.page).toBe('1')
        ctx.send('Search results')
      })

      req.url = '/search?q=test&page=1'
      await app.testCallback(req, res)

      expect(res.statusCode).toBe(200)
    })

    test('应该正确处理 404 错误', async () => {
      req.url = '/nonexistent'
      await app.testCallback(req, res)

      expect(res.statusCode).toBe(404)
    })

    test('应该正确处理中间件错误', async () => {
      const errorMiddleware: Middleware<MockRequest, MockResponse> = async () => {
        throw new RuiError('中间件错误', 400, 'MIDDLEWARE_ERROR')
      }

      app.addMiddleware(errorMiddleware)
      
      await app.testCallback(req, res)

      expect(res.statusCode).toBe(400)
    })

    test('应该正确处理未知错误', async () => {
      const errorMiddleware: Middleware<MockRequest, MockResponse> = async () => {
        throw new Error('未知错误')
      }

      app.addMiddleware(errorMiddleware)
      
      await app.testCallback(req, res)

      expect(res.statusCode).toBe(500)
    })

    test('应该正确处理错误 Hook', async () => {
      const errorHook = jest.fn()
      app.addHook('onError', errorHook)

      const errorMiddleware: Middleware<MockRequest, MockResponse> = async () => {
        throw new Error('测试错误')
      }

      app.addMiddleware(errorMiddleware)
      
      await app.testCallback(req, res)

      expect(errorHook).toHaveBeenCalled()
      expect(errorHook.mock.calls[0][1]).toBeInstanceOf(Error)
    })

    test('应该正确处理请求超时', async () => {
      app.setConfig({ timeout: 100 })

      const slowMiddleware: Middleware<MockRequest, MockResponse> = async (ctx, next) => {
        await new Promise(resolve => setTimeout(resolve, 200))
        await next()
      }

      app.addMiddleware(slowMiddleware)
      app.router.get('/', (ctx) => ctx.send('OK'))

      await app.testCallback(req, res)

      // 超时应该被处理
      expect(res.statusCode).toBe(408)
    })
  })

  describe('中间件组合', () => {
    test('应该防止重复调用 next()', async () => {
      const badMiddleware: Middleware<MockRequest, MockResponse> = async (ctx, next) => {
        await next()
        await next() // 重复调用
      }

      app.addMiddleware(badMiddleware)
      app.router.get('/', (ctx) => ctx.send('OK'))

      await app.testCallback(req, res)

      expect(res.statusCode).toBe(500)
    })

    test('应该正确处理异步中间件', async () => {
      const asyncMiddleware: Middleware<MockRequest, MockResponse> = async (ctx, next) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        ctx.asyncTest = true
        await next()
      }

      app.addMiddleware(asyncMiddleware)
      app.router.get('/', (ctx) => {
        expect(ctx.asyncTest).toBe(true)
        ctx.send('OK')
      })

      await app.testCallback(req, res)

      expect(res.statusCode).toBe(200)
    })
  })

  describe('Hook 错误隔离', () => {
    test('应该隔离 Hook 执行错误', async () => {
      const goodHook = jest.fn()
      const badHook = jest.fn().mockRejectedValue(new Error('Hook 错误'))
      const anotherGoodHook = jest.fn()

      app.addHook('onRequest', goodHook)
      app.addHook('onRequest', badHook)
      app.addHook('onRequest', anotherGoodHook)

      app.router.get('/', (ctx) => ctx.send('OK'))

      await app.testCallback(req, res)

      expect(goodHook).toHaveBeenCalled()
      expect(badHook).toHaveBeenCalled()
      expect(anotherGoodHook).toHaveBeenCalled()
      expect(res.statusCode).toBe(200) // 请求应该正常完成
    })
  })
})