import type {
  CommonRequest,
  CommonResponse,
  HttpMethod,
  Middleware,
  RouteFunction,
  RouteHandler,
  Context
} from '../type'
import { RuiError } from '../error/index.js'

export const methods: HttpMethod[] = ['delete', 'get', 'head', 'patch', 'post', 'put', 'options']

interface RouteNode<T extends CommonRequest, D extends CommonResponse> {
  handler?: RouteHandler<T, D>;
  paramName?: string;
  children: Map<string, RouteNode<T, D>>;
  wildcardChild?: RouteNode<T, D>;
  paramChild?: RouteNode<T, D>;
}

interface RouteMatch<T extends CommonRequest, D extends CommonResponse> {
  handler?: RouteHandler<T, D>;
  params: Record<string, string>;
}

class Router<T extends CommonRequest, D extends CommonResponse> {
  private routes: Map<HttpMethod, RouteNode<T, D>>

  constructor () {
    this.routes = new Map()
    methods.forEach(method => {
      this.routes.set(method, { children: new Map() })
    })
  }

  private compose = (middlewares: Middleware<T, D>[]): RouteHandler<T, D> => {
    if (middlewares.length === 0) {
      return async () => {}
    }

    if (middlewares.length === 1) {
      return middlewares[0] as RouteHandler<T, D>
    }

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

        const fn = middlewares[i]
        if (i === middlewares.length - 1) {
          await (fn as RouteHandler<T, D>)(ctx)
        } else {
          await (fn as Middleware<T, D>)(ctx, () => dispatch(i + 1))
        }
      }

      return dispatch(0)
    }
  }

  private parsePath (path: string): string[] {
    if (!path || path === '/') {
      return []
    }

    return path
      .split('/')
      .filter(segment => segment.length > 0)
      .map(segment => decodeURIComponent(segment))
  }

  private validatePath (path: string): void {
    if (typeof path !== 'string') {
      throw new RuiError(`Route '${path}' error, path must be a string`, 500)
    }

    if (!path.startsWith('/')) {
      throw new RuiError(`Route '${path}' error, path must start with /`, 500)
    }

    if (path === '/') {
      return
    }

    const parameterNames: Record<string, boolean> = {}
    path.slice(1).split('/').forEach(segment => {
      if (!segment) {
        throw new RuiError(`Route '${path}' error, there cannot be any space between two /`, 500)
      }
      
      if (segment === ':') {
        throw new RuiError(`Route '${path}' error, url parameter name cannot be empty`, 500)
      }

      if (segment.startsWith(':')) {
        const name = segment.slice(1)
        if (!parameterNames[name]) {
          parameterNames[name] = true
        } else {
          throw new RuiError(`Route '${path}' error, conflicting parameter names ${name}`, 500)
        }
      }
    })
  }

  private validateHandlers (args: any[]): void {
    if (args.length === 0) {
      throw new RuiError('Route must have at least one handler', 500)
    }

    args.forEach((handler, idx) => {
      if (typeof handler !== 'function') {
        throw new RuiError(`Routing ${idx === args.length - 1 ? 'handler' : 'middleware'} must be a function`, 500)
      }
    })
  }

  private route = (method: HttpMethod, path: string, ...args: [...Middleware<T, D>[], RouteHandler<T, D>]): void => {
    this.validatePath(path)
    this.validateHandlers(args)

    const segments = this.parsePath(path)
    let currentNode = this.routes.get(method)!

    for (const segment of segments) {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1)
        if (!paramName) {
          throw new RuiError('Parameter name cannot be empty', 500)
        }

        if (!currentNode.paramChild) {
          currentNode.paramChild = {
            children: new Map(),
            paramName
          }
        } else if (currentNode.paramChild.paramName !== paramName) {
          throw new RuiError(`Conflicting parameter names: ${currentNode.paramChild.paramName} vs ${paramName}`, 500)
        }

        currentNode = currentNode.paramChild
      } else if (segment === '*') {
        if (!currentNode.wildcardChild) {
          currentNode.wildcardChild = { children: new Map() }
        }
        currentNode = currentNode.wildcardChild
      } else {
        if (!currentNode.children.has(segment)) {
          currentNode.children.set(segment, { children: new Map() })
        }
        currentNode = currentNode.children.get(segment)!
      }
    }

    if (currentNode.handler) {
      console.warn(`Route ${method.toUpperCase()} ${path} is being overwritten`)
    }

    currentNode.handler = this.compose(args)
  }

  findRoute = (method: HttpMethod, path: string): RouteMatch<T, D> => {
    if (!method || !methods.includes(method)) {
      return { params: {} }
    }

    const segments = this.parsePath(path)
    const rootNode = this.routes.get(method)

    if (!rootNode) {
      return { params: {} }
    }

    const params: Record<string, string> = {}

    const findMatch = (node: RouteNode<T, D>, segmentIndex: number): RouteNode<T, D> | null => {
      if (segmentIndex === segments.length) {
        return node.handler ? node : (node.wildcardChild || null)
      }

      const segment = segments[segmentIndex]

      if (node.children.has(segment)) {
        const staticMatch = findMatch(node.children.get(segment)!, segmentIndex + 1)
        if (staticMatch) return staticMatch
      }

      if (node.paramChild) {
        const paramMatch = findMatch(node.paramChild, segmentIndex + 1)
        if (paramMatch && node.paramChild.paramName) {
          params[node.paramChild.paramName] = segment
          return paramMatch
        }
      }

      if (node.wildcardChild) {
        return node.wildcardChild
      }

      return null
    }

    const matchedNode = findMatch(rootNode, 0)

    return {
      handler: matchedNode?.handler,
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
    methods.forEach(method => {
      this.route(method, path, ...args)
    })
  }

  group = (prefix: string, callback: (router: Router<T, D>) => void): void => {
    this.validatePath(prefix)

    const groupRouter = new Router<T, D>()
    callback(groupRouter)

    for (const [method, rootNode] of groupRouter.routes) {
      this.mergeRoutes(method, prefix, rootNode)
    }
  }

  private mergeRoutes = (method: HttpMethod, prefix: string, sourceNode: RouteNode<T, D>): void => {
    const prefixSegments = this.parsePath(prefix)
    let currentNode = this.routes.get(method)!

    for (const segment of prefixSegments) {
      if (!currentNode.children.has(segment)) {
        currentNode.children.set(segment, { children: new Map() })
      }
      currentNode = currentNode.children.get(segment)!
    }

    this.mergeNode(currentNode, sourceNode)
  }

  private mergeNode = (targetNode: RouteNode<T, D>, sourceNode: RouteNode<T, D>): void => {
    if (sourceNode.handler) {
      targetNode.handler = sourceNode.handler
    }

    if (sourceNode.paramName) {
      targetNode.paramName = sourceNode.paramName
    }

    for (const [key, childNode] of sourceNode.children) {
      if (!targetNode.children.has(key)) {
        targetNode.children.set(key, { children: new Map() })
      }
      this.mergeNode(targetNode.children.get(key)!, childNode)
    }

    if (sourceNode.paramChild) {
      if (!targetNode.paramChild) {
        targetNode.paramChild = { children: new Map() }
      }
      this.mergeNode(targetNode.paramChild, sourceNode.paramChild)
    }

    if (sourceNode.wildcardChild) {
      if (!targetNode.wildcardChild) {
        targetNode.wildcardChild = { children: new Map() }
      }
      this.mergeNode(targetNode.wildcardChild, sourceNode.wildcardChild)
    }
  }

  getRoutes = (): Array<{ method: string; path: string }> => {
    const routes: Array<{ method: string; path: string }> = []

    for (const [method, rootNode] of this.routes) {
      this.collectRoutes(method, '', rootNode, routes)
    }

    return routes
  }

  private collectRoutes = (
    method: HttpMethod,
    currentPath: string,
    node: RouteNode<T, D>,
    routes: Array<{ method: string; path: string }>
  ): void => {
    if (node.handler) {
      routes.push({ method: method.toUpperCase(), path: currentPath || '/' })
    }

    for (const [segment, childNode] of node.children) {
      this.collectRoutes(method, `${currentPath}/${segment}`, childNode, routes)
    }

    if (node.paramChild) {
      this.collectRoutes(method, `${currentPath}/:${node.paramChild.paramName}`, node.paramChild, routes)
    }

    if (node.wildcardChild) {
      this.collectRoutes(method, `${currentPath}/*`, node.wildcardChild, routes)
    }
  }
}

export default Router
