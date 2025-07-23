import context from '../context/index.js'
import parser from '../parser/index.js'
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

// export interface AddHookFunction<T extends CommonRequest, D extends CommonResponse, U> {
//   (name: Exclude<HookType, 'onError'>, fn: (ctx: Context<T, D>) => void): U;
//   (name: 'onError', fn: (ctx: Context<T, D>, err: Error) => void): U;
// }

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
      preParsing: [],
      preHandler: [],
      onBeforeResponse: [],
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

  private handleResponse = async (ctx: Context<T, D>) => {
    ctx.res.statusCode = 404
    if (ctx.body != null) {
      ctx.res.statusCode = 200
    }

    await this.executeHooks('onBeforeResponse', ctx)

    // TODO: type of body
    // TODO: content-type ?
    if (ctx.res.writable) {
      ctx.res.end(ctx.body as any)
    }

    await this.executeHooks('onResponse', ctx)
  }

  private executeHandler = async (ctx: Context<T, D>) => {
    await this.executeHooks('preParsing', ctx)

    await this.compose([
      ...this.middlewares,
      async (_ctx) => {
        const { pathname, query, data } = await parser(_ctx)
        const method = (_ctx.req.method || '').toLowerCase() as HttpMethod
        const { params = {}, handler } = (this.router as Router<T, D>).findRoute(method, pathname)
        _ctx.params = params
        _ctx.pathname = pathname
        _ctx.query = query
        _ctx.data = data

        if (!handler) {
          return
        }

        await this.executeHooks('preHandler', _ctx)
        await handler(_ctx)
      }
    ])(ctx)
  }

  protected callback = async (req: T, res: D) => {
    const ctx = Object.create(this.context) as Context<T, D>
    ctx.req = req
    ctx.res = res

    try {
      await this.executeHooks('onRequest', ctx)
      await this.executeHandler(ctx)
      await this.handleResponse(ctx)
    } catch (err) {
      this.executeHooks('onError', ctx, err as Error)
        .catch(() => { })
        .finally(() => {
          ctx.res.statusCode = 404
          if (ctx.body !== null) {
            ctx.res.statusCode = 200
          }

          ctx.res.end(ctx.body as any)
        })
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
