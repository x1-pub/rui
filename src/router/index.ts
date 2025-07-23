import { CommonRequest, CommonResponse, HttpMethod, Middleware, RouteFunction, RouteHandler, Context } from '../type'

const methods: HttpMethod[] = ['delete', 'get', 'head', 'patch', 'post', 'put', 'options']

interface RouteNode<T extends CommonRequest, D extends CommonResponse> {
  handler?: RouteHandler<T, D>;
  params?: string;
  children: Map<string, RouteNode<T, D>>;
  wildcard?: RouteNode<T, D>;
}

class Router<T extends CommonRequest, D extends CommonResponse> {
  private routes: Map<HttpMethod, RouteNode<T, D>>

  constructor () {
    this.routes = new Map()
    methods.forEach(method => {
      this.routes.set(method, { children: new Map() })
    })
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

  private parsePath (path: string): string[] {
    return path.split('/').filter(segment => segment.length > 0)
  }

  private route = (method: HttpMethod, path: string, ...args: [...Middleware<T, D>[], RouteHandler<T, D>]) => {
    const segments = this.parsePath(path)
    let currentNode = this.routes.get(method)!

    for (const segment of segments) {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1)

        if (!currentNode.params) {
          currentNode.params = paramName
          currentNode.children.set('$param', { children: new Map() })
        }

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

  findRoute = (method: HttpMethod, path: string) => {
    if (!method || !methods.includes(method)) {
      return {}
    }

    const segments = this.parsePath(path)
    const currentNode = this.routes.get(method)
    const params: Record<string, string> = {}

    if (!currentNode) {
      return {}
    }

    let node: RouteNode<T, D> | undefined = currentNode

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

  delete: RouteFunction<T, D> = (path, ...args) => {
    this.route('delete', path, ...args)
  }

  get: RouteFunction<T, D> = (path, ...args) => {
    this.route('get', path, ...args)
  }

  head: RouteFunction<T, D> = (path, ...args) => {
    this.route('head', path, ...args)
  }

  patch: RouteFunction<T, D> = (path, ...args) => {
    this.route('patch', path, ...args)
  }

  post: RouteFunction<T, D> = (path, ...args) => {
    this.route('post', path, ...args)
  }

  put: RouteFunction<T, D> = (path, ...args) => {
    this.route('put', path, ...args)
  }

  options: RouteFunction<T, D> = (path, ...args) => {
    this.route('options', path, ...args)
  }

  all: RouteFunction<T, D> = (path, ...args) => {
    this.route('delete', path, ...args)
    this.route('get', path, ...args)
    this.route('head', path, ...args)
    this.route('patch', path, ...args)
    this.route('post', path, ...args)
    this.route('put', path, ...args)
    this.route('options', path, ...args)
  }
}

export default Router
