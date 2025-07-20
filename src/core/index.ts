import urlParser from '../middlewares/url-parse/index.js'
import context from '../context/index.js'
import type { Context, Middleware, Request, Response, AppOptions, HookType, AddHookFunction } from '../type'
import dataParser from '../middlewares/data-parse/index.js'

abstract class App<RequestType extends Request, ResponseType extends Response> {
  private context: Context<RequestType, ResponseType>
  private middlewares: Middleware<RequestType, ResponseType>[]
  private hooks: Record<HookType, AddHookFunction<RequestType, Response, this>[]>

  constructor (options?: AppOptions) {
    this.middlewares = this.initMiddlewares()
    this.hooks = this.initHooks()
    this.context = Object.create(context) as Context<RequestType, ResponseType>
  }

  private initMiddlewares = () => {
    return [urlParser, dataParser]
  }

  private initHooks = () => {
    return {
      onRequest: [],
      onBeforeResponse: [],
      onResponse: [],
      onError: []
    }
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

  private handleRequest = async (ctx: Context<RequestType, ResponseType>) => {
    // TODO: catch error
    await this.executeMiddlewares(ctx)
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

  callback = async (req: RequestType, res: ResponseType) => {
    const ctx = Object.create(this.context) as Context<RequestType, ResponseType>
    ctx.req = req
    ctx.res = res

    try {
      await this.executeHooks('onRequest', ctx)
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

  use = (fn: Middleware<RequestType, ResponseType>) => {
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
}

export default App
