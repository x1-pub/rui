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
  AddHookFunction,
  Plugin,
  PluginOptions,
  HttpMethod
} from '../type'

abstract class App<T extends CommonRequest, D extends CommonResponse> {
  private context!: Context<T, D>
  private middlewares!: Middleware<T, D>[]
  private hooks!: Record<HookType, AddHookFunction<T, D, this>[]>
  private plugins!: [Plugin<this>, PluginOptions][]

  public router!: Omit<Router<T, D>, 'findRoute'>

  constructor (options?: AppOptions) {
    this.initContext()
    this.initMiddlewares()
    this.initHooks()
    this.initPlugins()
    this.initRouter()
  }

  private initContext = () => {
    this.context = Object.create(context) as Context<T, D>
  }

  private initMiddlewares = () => {
    this.middlewares = []
  }

  private initHooks = () => {
    this.hooks = {
      onRequest: [],
      onPreParsing: [],
      onPreHandler: [],
      onPreSerialization: [],
      onPreResponse: [],
      onResponse: [],
      onError: []
    }
  }

  private initPlugins = () => {
    this.plugins = []
  }

  private initRouter = () => {
    this.router = new Router<T, D>()
  }

  private executeHooks = async (name: HookType, ctx: Context<T, D>, err?: Error) => {
    // @ts-expect-error 触发onError时 err一定存在
    const promisis = this.hooks[name].map(fn => fn(ctx, err))
    await Promise.all(promisis)
  }

  private compose = (middlewares: Middleware<T, D>[]) => {
    const dispatch = (ctx: Context<T, D>, i: number = 0): Promise<void> => {
      if (middlewares.length === i) {
        return Promise.resolve()
      }

      const fn = middlewares[i]
      return Promise.resolve(fn(ctx, () => dispatch(ctx, i + 1)))
    }

    return dispatch
  }

  protected executePlugins = async () => {
    for (const [fn, options] of this.plugins) {
      await fn(this, options)
    }
  }

  private serialize = (ctx: Context<T, D>) => {
    this.executeHooks('onPreSerialization', ctx)

    const contentType = ReplyResolver.contentType(ctx)
    const status = ReplyResolver.status(ctx)
    const responseData = ReplyResolver.data(ctx)

    ctx.res.setHeader('content-type', contentType || '')
    ctx.res.statusCode = status
    ctx.responseData = responseData
  }

  private send = (ctx: Context<T, D>) => {
    this.executeHooks('onPreResponse', ctx)

    if (ctx.res.writable && !ctx.res.writableEnded) {
      ctx.res.end(ctx.responseData as any)
    }
  }

  private handleRequest = async (ctx: Context<T, D>) => {
    await this.executeHooks('onPreParsing', ctx)

    const { pathname, query, body } = await parser(ctx)
    const method = (ctx.req.method || '').toLowerCase() as HttpMethod
    const { params = {}, handler = () => { } } = (this.router as Router<T, D>).findRoute(method, pathname)
    ctx.params = params
    ctx.pathname = pathname
    ctx.query = query
    ctx.body = body

    await this.executeHooks('onPreHandler', ctx)

    await handler(ctx)
  }

  private executeMiddlewares = async (ctx: Context<T, D>) => {
    await this.compose([...this.middlewares, this.handleRequest])(ctx)
  }

  private handleResponse = async (ctx: Context<T, D>) => {
    await this.serialize(ctx)
    await this.send(ctx)
  }

  private handleError = async (ctx: Context<T, D>, err: Error) => {
    this.executeHooks('onError', ctx, err)
      .catch(() => { })
      .finally(() => this.handleResponse(ctx))
  }

  protected callback = async (req: T, res: D) => {
    const ctx = Object.create(this.context) as Context<T, D>
    ctx.req = req
    ctx.res = res

    ctx.res.on('finish', () => {
      this.executeHooks('onResponse', ctx)
    })

    try {
      await this.executeHooks('onRequest', ctx)
      await this.executeMiddlewares(ctx)
      await this.handleResponse(ctx)
    } catch (err) {
      this.handleError(ctx, err as Error)
    }
  }

  addMiddlewares = (fn: Middleware<T, D>) => {
    if (typeof fn !== 'function') {
      throw new Error('middleware must be a function!')
    }
    this.middlewares.push(fn)
    return this
  }

  addHook: AddHookFunction<T, D, this> = (name, fn) => {
    if (typeof fn !== 'function') {
      throw new Error('hook callback must be a function!')
    }
    if (!this.hooks[name]) {
      throw new Error('unknown hook name!')
    }
    // @ts-expect-error 第二个参数为onError的
    this.hooks[name].push(fn)
    return this
  }

  addPlugin = (fn: Plugin<this>, options?: PluginOptions) => {
    this.plugins.push([fn, options || {}])
    return this
  }
}

export default App
