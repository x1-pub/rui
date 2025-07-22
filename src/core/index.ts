import context from '../context/index.js'
import parser from '../parser/index.js'
import type { Context, Middleware, Request, Response, AppOptions, HookType, AddHookFunction, Plugin, PluginOptions, HttpMethod, RouteHandler, RouteFunction } from '../type'

const methods: HttpMethod[] = ['delete', 'get', 'head', 'patch', 'post', 'put', 'options']
interface RouteNode<T extends Request, D extends Response> {
  handler?: RouteHandler<T, D>;
  params?: string;
  children: Map<string, RouteNode<T, D>>;
  wildcard?: RouteNode<T, D>;
}

abstract class App<RequestType extends Request, ResponseType extends Response> {
  private context: Context<RequestType, ResponseType>
  private middlewares: Middleware<RequestType, ResponseType>[]
  private hooks: Record<HookType, AddHookFunction<RequestType, Response, this>[]>
  private plugins: [Plugin<this>, PluginOptions][]
  private routes: Map<HttpMethod, RouteNode<RequestType, ResponseType>>

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
    this.routes = new Map()
    methods.forEach(method => {
      this.routes.set(method, { children: new Map() })
    })
    this.context = Object.create(context) as Context<RequestType, ResponseType>
  }

  private parsePath (path: string): string[] {
    return path.split('/').filter(segment => segment.length > 0)
  }

  private route = (method: HttpMethod, path: string, ...args: [...Middleware<RequestType, ResponseType>[], RouteHandler<RequestType, ResponseType>]) => {
    const segments = this.parsePath(path)
    let currentNode = this.routes.get(method)!

    for (const segment of segments) {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1)

        if (!currentNode.params) {
          currentNode.params = paramName
          currentNode.children.set('$param', { children: new Map() })
        }

        // 移动到参数节点
        currentNode = currentNode.children.get('$param')!
      } else if (segment === '*') {
        if (!currentNode.wildcard) {
          currentNode.wildcard = { children: new Map() }
        }
        currentNode = currentNode.wildcard
      } else {
        if (!currentNode.children.has(segment)) {
          currentNode.children.set(segment, { children: new Map() })
        }
        currentNode = currentNode.children.get(segment)!
      }
    }

    currentNode.handler = this.compose(args)
  }

  private findRoute = (method: HttpMethod, path: string) => {
    if (!method || !methods.includes(method)) {
      return {}
    }

    const segments = this.parsePath(path)
    const currentNode = this.routes.get(method)
    const params: Record<string, string> = {}

    if (!currentNode) {
      return {}
    }

    let node: RouteNode<RequestType, ResponseType> | undefined = currentNode

    for (const segment of segments) {
      if (node.children.has(segment)) {
        node = node.children.get(segment)
      } else if (node.params) {
        params[node.params] = segment
        node = node.children.get('$param')
      } else if (node.wildcard) {
        node = node.wildcard
      } else {
        return {}
      }

      if (!node) {
        return {}
      }
    }

    if (!node.handler && node.wildcard) {
      node = node.wildcard
    }

    return {
      handler: node.handler,
      params
    }
  }

  private executeHooks = async (name: HookType, ctx: Context<RequestType, ResponseType>, err?: Error) => {
    // @ts-expect-error 触发onError时 err一定存在
    const promisis = this.hooks[name].map(fn => fn(ctx, err))
    await Promise.all(promisis)
  }

  private compose = (middlewares: Middleware<RequestType, ResponseType>[]) => {
    const dispatch = (ctx: Context<RequestType, ResponseType>, i: number = 0): Promise<void> => {
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

  private handleResponse = async (ctx: Context<RequestType, ResponseType>) => {
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

  private executeHandler = async (ctx: Context<RequestType, ResponseType>) => {
    await this.executeHooks('preParsing', ctx)

    await this.compose([
      ...this.middlewares,
      async (_ctx) => {
        const { pathname, query, data } = await parser(_ctx)
        const method = (_ctx.req.method || '').toLowerCase() as HttpMethod
        const { params = {}, handler } = this.findRoute(method, pathname)
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

  protected callback = async (req: RequestType, res: ResponseType) => {
    const ctx = Object.create(this.context) as Context<RequestType, ResponseType>
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

  delete: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('delete', path, ...args)
  }

  get: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('get', path, ...args)
  }

  head: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('head', path, ...args)
  }

  patch: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('patch', path, ...args)
  }

  post: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('post', path, ...args)
  }

  put: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('put', path, ...args)
  }

  options: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('options', path, ...args)
  }

  all: RouteFunction<RequestType, ResponseType> = (path, ...args) => {
    this.route('delete', path, ...args)
    this.route('get', path, ...args)
    this.route('head', path, ...args)
    this.route('patch', path, ...args)
    this.route('post', path, ...args)
    this.route('put', path, ...args)
    this.route('options', path, ...args)
  }
}

export default App
