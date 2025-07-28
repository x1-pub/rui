import context from '../context/index.js'
import parser from '../parser/index.js'
import ReplyResolver from '../reply/index.js'
import Router from '../router/index.js'
import type {
  Context,
  Middleware,
  CommonRequest,
  CommonResponse,
  AppOptions,
  HookType,
  AddHook,
  Plugin,
  PluginOptions,
  HttpMethod,
  HookFunction,
  ErrorHookFunction,
  GlobalConfig,
} from '../type'
import { RuiError } from '../error/index.js'

abstract class App<T extends CommonRequest, D extends CommonResponse> {
  private context: Context<T, D>
  private middlewares: Middleware<T, D>[] = []
  private hooks: Record<HookType, (HookFunction<T, D> | ErrorHookFunction<T, D>)[]> = {
    onRequest: [],
    onPreParsing: [],
    onPreHandler: [],
    onPreSerialization: [],
    onPreResponse: [],
    onResponse: [],
    onError: []
  }

  private plugins: [Plugin<this>, PluginOptions][] = []
  protected options: AppOptions & Partial<GlobalConfig>
  public router: Omit<Router<T, D>, 'findRoute'>

  constructor(options?: AppOptions & Partial<GlobalConfig>) {
    this.context = Object.create(context) as Context<T, D>
    this.router = new Router<T, D>()
    this.options = {
      bodyLimit: 1024 * 1024,
      timeout: 30000,
      encoding: 'utf-8',
      trustProxy: true,
      ...options
    }
  }

  private executeHooks = async (name: HookType, ctx: Context<T, D>, err?: Error): Promise<void> => {
    const hooks = this.hooks[name]
    if (!hooks.length) return

    const results = await Promise.allSettled(
      hooks.map(async (fn) => {
        try {
          if (name === 'onError' && err) {
            return await (fn as ErrorHookFunction<T, D>)(ctx, err)
          } else if (name !== 'onError') {
            return await (fn as HookFunction<T, D>)(ctx)
          }
        } catch (hookError) {
          console.error(`Hook ${name} execution failed:`, hookError)
          throw hookError
        }
      })
    )

    const failures = results.filter(result => result.status === 'rejected')
    if (failures.length > 0) {
      console.warn(`${failures.length} hooks failed in ${name}`)
    }
  }

  private compose = (middlewares: Middleware<T, D>[]): ((ctx: Context<T, D>) => Promise<void>) => {
    return async (ctx: Context<T, D>): Promise<void> => {
      let index = -1

      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) {
          throw new RuiError('next() called multiple times', 500)
        }
        index = i

        if (i === middlewares.length) {
          return
        }

        await middlewares[i](ctx, () => dispatch(i + 1))
      }

      return dispatch(0)
    }
  }

  protected executePlugins = async (): Promise<void> => {
    for (const [fn, options] of this.plugins) {
      try {
        await fn(this, options)
      } catch (error) {
        console.error('Plugin execution failed:', error)
        throw error
      }
    }
  }

  private setResponseValue = (ctx: Context<T, D>) => {
    const contentType = ReplyResolver.contentType(ctx)
    const status = ReplyResolver.status(ctx)
    const data = ReplyResolver.data(ctx)

    if (contentType) {
      ctx.res.setHeader('content-type', contentType)
    }
    ctx.res.statusCode = status
    ctx._responseData = data

    return data
  }

  private send = async (ctx: Context<T, D>): Promise<void> => {
    await this.executeHooks('onPreSerialization', ctx)
    const data = this.setResponseValue(ctx)
    await this.executeHooks('onPreResponse', ctx)
    if (ctx.res.writable && !ctx.res.writableEnded && data) {
      ctx.res.end(data)
    } else {
      ctx.res.end()
    }
  }

  private handleRequest = async (ctx: Context<T, D>): Promise<void> => {
    await this.executeHooks('onPreParsing', ctx)

    const { pathname, query, body } = await parser(ctx)
    const method = (ctx.req.method || '').toLowerCase() as HttpMethod
    const { params = {}, handler } = (this.router as Router<T, D>).findRoute(method, pathname)

    ctx.params = params
    ctx.pathname = pathname
    ctx.query = query
    ctx.body = body

    await this.executeHooks('onPreHandler', ctx)

    if (handler) {
      await handler(ctx)
    } else {
      throw new RuiError(`Cannot ${method.toUpperCase()} ${pathname}`, 404, 'ROUTE_NOT_FOUND')
    }
  }

  private executeMiddlewares = async (ctx: Context<T, D>): Promise<void> => {
    const composedMiddleware = this.compose([...this.middlewares, this.handleRequest])
    await composedMiddleware(ctx)
  }

  private handleError = async (ctx: Context<T, D>, err: Error): Promise<void> => {
    try {
      await this.executeHooks('onError', ctx, err)
    } catch (hookError) {
      console.error('Error hook execution failed:', hookError)
    } finally {
      const data = this.setResponseValue(ctx)
      if (ctx.res.writable && !ctx.res.writableEnded && data) {
        ctx.res.end(data)
      } else {
        ctx.res.end()
      }
    }
  }

  protected callback = async (req: T, res: D): Promise<void> => {
    const ctx = Object.create(this.context) as Context<T, D>
    ctx.req = req
    ctx.res = res

    const timeout = setTimeout(() => {
      if (!res.writableEnded) {
        res.statusCode = 408
        res.end('Request Timeout')
      }
    }, this.options.timeout)

    ctx.res.on('finish', async () => {
      clearTimeout(timeout)
      try {
        await this.executeHooks('onResponse', ctx)
      } catch (error) {
        console.error('onResponse hook failed:', error)
      }
    })

    try {
      await this.executeHooks('onRequest', ctx)
      await this.executeMiddlewares(ctx)
      await this.send(ctx)
    } catch (err) {
      await this.handleError(ctx, err as Error)
    } finally {
      clearTimeout(timeout)
    }
  }

  addMiddleware = (fn: Middleware<T, D>): this => {
    if (typeof fn !== 'function') {
      throw new RuiError('Middleware must be a function', 500)
    }
    this.middlewares.push(fn)
    return this
  }

  addHook: AddHook<T, D, this> = (name: HookType, fn: any): this => {
    if (typeof fn !== 'function') {
      throw new RuiError('Hook callback must be a function', 500)
    }
    if (!this.hooks[name]) {
      throw new RuiError(`Unknown hook name: ${name}`, 500)
    }
    this.hooks[name].push(fn)
    return this
  }

  addPlugin = (fn: Plugin<this>, options: PluginOptions = {}): this => {
    if (typeof fn !== 'function') {
      throw new RuiError('Plugin must be a function', 500)
    }
    this.plugins.push([fn, options])
    return this
  }

  setConfig = (config: Partial<GlobalConfig>) => {
    this.options = { ...this.options, ...config }
  }

  getConfig = (): GlobalConfig => {
    return { ...this.options }
  }
}

export default App
