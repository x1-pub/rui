import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import Router from '../src/router/index.js'
import { RuiError } from '../src/type'
import type { CommonRequest, CommonResponse, Context, Middleware, RouteHandler } from '../src/type'

// 模拟上下文对象
const createMockContext = (): Context<any, any> => ({
  req: { method: 'GET', url: '/', headers: {}, socket: {} } as any,
  res: { statusCode: 200, setHeader: jest.fn(), getHeader: jest.fn() } as any,
  protocol: 'http',
  pathname: '/',
  query: {},
  host: 'localhost',
  params: {},
  body: null,
  _responseData: null,
  send: jest.fn().mockReturnThis(),
  code: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
  setHeaders: jest.fn(),
  setCookie: jest.fn(),
  getCookie: jest.fn(),
  getCookies: jest.fn(),
  deleteCookie: jest.fn(),
  clearCookie: jest.fn()
})

describe('路由器测试', () => {
  let router: Router<any, any>

  beforeEach(() => {
    router = new Router()
  })

  describe('基本路由注册', () => {
    test('应该正确注册 GET 路由', () => {
      const handler = jest.fn()
      router.get('/test', handler)

      const result = router.findRoute('get', '/test')
      expect(result.handler).toBeDefined()
      expect(result.params).toEqual({})
    })

    test('应该正确注册所有 HTTP 方法', () => {
      const handler = jest.fn()
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

      methods.forEach(method => {
        router[method]('/test', handler)
        const result = router.findRoute(method, '/test')
        expect(result.handler).toBeDefined()
      })
    })

    test('应该正确注册 all 路由', () => {
      const handler = jest.fn()
      router.all('/test', handler)

      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const
      methods.forEach(method => {
        const result = router.findRoute(method, '/test')
        expect(result.handler).toBeDefined()
      })
    })
  })

  describe('路径验证', () => {
    test('应该拒绝非字符串路径', () => {
      expect(() => {
        router.get(123 as any, jest.fn())
      }).toThrow(RuiError)
    })

    test('应该拒绝不以 / 开头的路径', () => {
      expect(() => {
        router.get('test', jest.fn())
      }).toThrow(RuiError)
    })

    test('应该接受根路径', () => {
      expect(() => {
        router.get('/', jest.fn())
      }).not.toThrow()
    })
  })

  describe('处理器验证', () => {
    test('应该拒绝空处理器列表', () => {
      expect(() => {
        (router as any).route('get', '/test')
      }).toThrow(RuiError)
    })

    test('应该拒绝非函数处理器', () => {
      expect(() => {
        router.get('/test', 'not a function' as any)
      }).toThrow(RuiError)
    })

    test('应该接受多个中间件和处理器', () => {
      const middleware1 = jest.fn()
      const middleware2 = jest.fn()
      const handler = jest.fn()

      expect(() => {
        router.get('/test', middleware1, middleware2, handler)
      }).not.toThrow()
    })
  })

  describe('静态路由匹配', () => {
    test('应该正确匹配简单路径', () => {
      const handler = jest.fn()
      router.get('/users', handler)

      const result = router.findRoute('get', '/users')
      expect(result.handler).toBeDefined()
      expect(result.params).toEqual({})
    })

    test('应该正确匹配嵌套路径', () => {
      const handler = jest.fn()
      router.get('/api/v1/users', handler)

      const result = router.findRoute('get', '/api/v1/users')
      expect(result.handler).toBeDefined()
      expect(result.params).toEqual({})
    })

    test('应该区分不同的路径', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      router.get('/users', handler1)
      router.get('/posts', handler2)

      const result1 = router.findRoute('get', '/users')
      const result2 = router.findRoute('get', '/posts')
      
      expect(result1.handler).toBeDefined()
      expect(result2.handler).toBeDefined()
      expect(result1.handler).not.toBe(result2.handler)
    })

    test('应该处理根路径', () => {
      const handler = jest.fn()
      router.get('/', handler)

      const result = router.findRoute('get', '/')
      expect(result.handler).toBeDefined()
    })
  })

  describe('参数路由匹配', () => {
    test('应该正确匹配单个参数', () => {
      const handler = jest.fn()
      router.get('/users/:id', handler)

      const result = router.findRoute('get', '/users/123')
      expect(result.handler).toBeDefined()
      expect(result.params).toEqual({ id: '123' })
    })

    test('应该正确匹配多个参数', () => {
      const handler = jest.fn()
      router.get('/users/:userId/posts/:postId', handler)

      const result = router.findRoute('get', '/users/123/posts/456')
      expect(result.handler).toBeDefined()
      expect(result.params).toEqual({ userId: '123', postId: '456' })
    })

    test('应该正确处理 URL 编码的参数', () => {
      const handler = jest.fn()
      router.get('/search/:query', handler)

      const result = router.findRoute('get', '/search/hello%20world')
      expect(result.handler).toBeDefined()
      expect(result.params).toEqual({ query: 'hello world' })
    })

    test('应该拒绝空参数名', () => {
      expect(() => {
        router.get('/users/:', jest.fn())
      }).toThrow(RuiError)
    })

    test('应该检测参数名冲突', () => {
      router.get('/users/:id', jest.fn())
      
      expect(() => {
        router.get('/users/:userId', jest.fn())
      }).toThrow(RuiError)
    })
  })

  describe('通配符路由匹配', () => {
    test('应该正确匹配通配符路由', () => {
      const handler = jest.fn()
      router.get('/static/*', handler)

      const result = router.findRoute('get', '/static/css/style.css')
      expect(result.handler).toBeDefined()
      expect(result.params).toEqual({})
    })

    test('应该优先匹配具体路由', () => {
      const specificHandler = jest.fn()
      const wildcardHandler = jest.fn()
      
      router.get('/api/users', specificHandler)
      router.get('/api/*', wildcardHandler)

      const result = router.findRoute('get', '/api/users')
      expect(result.handler).toBe(specificHandler)
    })
  })

  describe('路由优先级', () => {
    test('静态路由应该优先于参数路由', () => {
      const staticHandler = jest.fn()
      const paramHandler = jest.fn()
      
      router.get('/users/new', staticHandler)
      router.get('/users/:id', paramHandler)

      const result = router.findRoute('get', '/users/new')
      expect(result.handler).toBe(staticHandler)
    })

    test('参数路由应该优先于通配符路由', () => {
      const paramHandler = jest.fn()
      const wildcardHandler = jest.fn()
      
      router.get('/users/:id', paramHandler)
      router.get('/users/*', wildcardHandler)

      const result = router.findRoute('get', '/users/123')
      expect(result.handler).toBe(paramHandler)
      expect(result.params).toEqual({ id: '123' })
    })
  })

  describe('中间件组合', () => {
    test('应该正确组合单个处理器', async () => {
      const handler = jest.fn()
      router.get('/test', handler)

      const result = router.findRoute('get', '/test')
      const ctx = createMockContext()
      
      await result.handler!(ctx)
      expect(handler).toHaveBeenCalledWith(ctx)
    })

    test('应该正确组合中间件和处理器', async () => {
      const middleware = jest.fn(async (ctx, next) => {
        ctx.middlewareExecuted = true
        await next()
      })
      const handler = jest.fn((ctx) => {
        expect(ctx.middlewareExecuted).toBe(true)
      })

      router.get('/test', middleware, handler)

      const result = router.findRoute('get', '/test')
      const ctx = createMockContext()
      
      await result.handler!(ctx)
      expect(middleware).toHaveBeenCalled()
      expect(handler).toHaveBeenCalled()
    })

    test('应该正确处理多个中间件', async () => {
      const order: number[] = []
      
      const middleware1 = jest.fn(async (ctx, next) => {
        order.push(1)
        await next()
        order.push(4)
      })
      
      const middleware2 = jest.fn(async (ctx, next) => {
        order.push(2)
        await next()
        order.push(3)
      })
      
      const handler = jest.fn(() => {
        order.push(5)
      })

      router.get('/test', middleware1, middleware2, handler)

      const result = router.findRoute('get', '/test')
      const ctx = createMockContext()
      
      await result.handler!(ctx)
      expect(order).toEqual([1, 2, 5, 3, 4])
    })

    test('应该防止重复调用 next()', async () => {
      const badMiddleware = jest.fn(async (ctx, next) => {
        await next()
        await next() // 重复调用
      })

      router.get('/test', badMiddleware, jest.fn())

      const result = router.findRoute('get', '/test')
      const ctx = createMockContext()
      
      await expect(result.handler!(ctx)).rejects.toThrow(RuiError)
    })
  })

  describe('路由组功能', () => {
    test('应该正确创建路由组', () => {
      router.group('/api/v1', (groupRouter) => {
        groupRouter.get('/users', jest.fn())
        groupRouter.post('/users', jest.fn())
      })

      const getResult = router.findRoute('get', '/api/v1/users')
      const postResult = router.findRoute('post', '/api/v1/users')
      
      expect(getResult.handler).toBeDefined()
      expect(postResult.handler).toBeDefined()
    })

    test('应该正确处理嵌套路由组', () => {
      router.group('/api', (apiRouter) => {
        apiRouter.group('/v1', (v1Router) => {
          v1Router.get('/users', jest.fn())
        })
      })

      const result = router.findRoute('get', '/api/v1/users')
      expect(result.handler).toBeDefined()
    })

    test('应该验证组前缀路径', () => {
      expect(() => {
        router.group('invalid-prefix', () => {})
      }).toThrow(RuiError)
    })
  })

  describe('路由信息获取', () => {
    test('应该正确获取所有路由信息', () => {
      router.get('/users', jest.fn())
      router.post('/users', jest.fn())
      router.get('/posts/:id', jest.fn())

      const routes = router.getRoutes()
      
      expect(routes).toHaveLength(3)
      expect(routes).toContainEqual({ method: 'GET', path: '/users' })
      expect(routes).toContainEqual({ method: 'POST', path: '/users' })
      expect(routes).toContainEqual({ method: 'GET', path: '/posts/:id' })
    })

    test('应该包含通配符路由信息', () => {
      router.get('/static/*', jest.fn())

      const routes = router.getRoutes()
      expect(routes).toContainEqual({ method: 'GET', path: '/static/*' })
    })

    test('应该包含根路径路由', () => {
      router.get('/', jest.fn())

      const routes = router.getRoutes()
      expect(routes).toContainEqual({ method: 'GET', path: '/' })
    })
  })

  describe('错误处理', () => {
    test('应该处理无效的 HTTP 方法', () => {
      const result = router.findRoute('invalid' as any, '/test')
      expect(result.handler).toBeUndefined()
      expect(result.params).toEqual({})
    })

    test('应该处理不存在的路由', () => {
      const result = router.findRoute('get', '/nonexistent')
      expect(result.handler).toBeUndefined()
      expect(result.params).toEqual({})
    })

    test('应该处理空路径', () => {
      const result = router.findRoute('get', '')
      expect(result.handler).toBeUndefined()
    })
  })

  describe('路由覆盖警告', () => {
    test('应该警告路由覆盖', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      router.get('/test', jest.fn())
      router.get('/test', jest.fn()) // 覆盖路由

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Route GET /test is being overwritten')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('性能测试', () => {
    test('应该高效处理大量路由', () => {
      // 注册大量路由
      for (let i = 0; i < 1000; i++) {
        router.get(`/route${i}`, jest.fn())
      }

      const startTime = Date.now()
      
      // 查找路由
      for (let i = 0; i < 100; i++) {
        router.findRoute('get', `/route${i}`)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // 应该在合理时间内完成（小于100ms）
      expect(duration).toBeLessThan(100)
    })

    test('应该高效处理参数路由查找', () => {
      // 注册混合路由
      for (let i = 0; i < 100; i++) {
        router.get(`/static${i}`, jest.fn())
        router.get(`/param${i}/:id`, jest.fn())
        router.get(`/wildcard${i}/*`, jest.fn())
      }

      const startTime = Date.now()
      
      // 查找不同类型的路由
      for (let i = 0; i < 50; i++) {
        router.findRoute('get', `/static${i}`)
        router.findRoute('get', `/param${i}/123`)
        router.findRoute('get', `/wildcard${i}/some/path`)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // 应该在合理时间内完成
      expect(duration).toBeLessThan(100)
    })
  })
})