import context from '../context/index.js'
import parser from '../parser/index.js'
import type { Context, Middleware, Request, Response, AppOptions, HookType, AddHookFunction, Plugin, PluginOptions, HttpHandler } from '../type'

// const methods: HttpMethod[] = ['delete', 'get', 'head', 'patch', 'post', 'put', 'options']

abstract class App<RequestType extends Request, ResponseType extends Response> {
  private context: Context<RequestType, ResponseType>
  private middlewares: Middleware<RequestType, ResponseType>[]
  private hooks: Record<HookType, AddHookFunction<RequestType, Response, this>[]>
  private plugins: [Plugin<this>, PluginOptions][]

  constructor (options?: AppOptions) {
    this.middlewares = []
    this.hooks = {
      onRequest: [],
      preParsing: [],
      preHandler: [],
      onBeforeResponse: [],
      onResponse: [],
      onError: []
    }
    this.plugins = []
    this.context = Object.create(context) as Context<RequestType, ResponseType>
  }

  private handler: HttpHandler<RequestType, ResponseType> = (path, handler) => {

  }

  private executeHooks = async (name: HookType, ctx: Context<RequestType, ResponseType>, err?: Error) => {
    // @ts-expect-error 触发onError时 err一定存在
    const promisis = this.hooks[name].map(fn => fn(ctx, err))
    await Promise.all(promisis)
  }

  private executeMiddlewares = (ctx: Context<RequestType, ResponseType>) => {
    const dispatch = (i: number): Promise<void> => {
      if (this.middlewares.length === i) {
        return Promise.resolve()
      }

      const fn = this.middlewares[i]
      return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
    }

    return dispatch(0)
  }

  protected executePlugins = async () => {
    for (const [fn, options] of this.plugins) {
      await fn(this, options)
    }
  }

  private handleRequest = async (ctx: Context<RequestType, ResponseType>) => {
    // await this.executeMiddlewares(ctx)

    // 匹配路由
    await this.handleResponse(ctx)
  }

  private handleResponse = async (ctx: Context<RequestType, ResponseType>) => {
    ctx.res.statusCode = 404
    if (ctx.body !== null) {
      ctx.res.statusCode = 200
    }

    await this.executeHooks('onBeforeResponse', ctx)

    // TODO: type of body
    // TODO: content-type ?
    if (!ctx.res.writable) {
      ctx.res.end(ctx.body as any)
    }

    await this.executeHooks('onResponse', ctx)
  }

  protected callback = async (req: RequestType, res: ResponseType) => {
    const ctx = Object.create(this.context) as Context<RequestType, ResponseType>
    ctx.req = req
    ctx.res = res

    try {
      await this.executeHooks('onRequest', ctx)
      await this.executeHooks('preParsing', ctx)
      parser(ctx)
      await this.executeHooks('preHandler', ctx)
      await this.handleRequest(ctx)
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

  addMiddlewares = (fn: Middleware<RequestType, ResponseType>) => {
    if (typeof fn !== 'function') {
      throw new Error('middleware must be a function!')
    }
    this.middlewares.push(fn)
    return this
  }

  addHook: AddHookFunction<RequestType, ResponseType, this> = (name, fn) => {
    if (typeof fn !== 'function') {
      throw new Error('hook must be a function!')
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

  delete = this.handler

  get = this.handler

  head = this.handler

  patch = this.handler

  post = this.handler

  put = this.handler

  options = this.handler

  all = this.handler
}

export default App
