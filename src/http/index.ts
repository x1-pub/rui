import { createServer, Server } from 'node:http'
import ServerFactory from '../core/factory.js'
import Validator from '../validator/index.js'
import type {
  HttpRequest,
  HttpResponse,
  Next,
  HttpAppOptions as RuiOptions,
  HttpContext as Context,
  HttpMiddleware as Middleware
} from '../type'
import type { ValidationRule } from '../validator/index.js'
import type HttpRouter from '../router/index.js'

type HttpServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>
type Router = HttpRouter<HttpRequest, HttpResponse>
interface RuiInstance extends HttpApp {}

class HttpApp extends ServerFactory<HttpRequest, HttpResponse, Server, RuiOptions> {
  protected createServer (): Server {
    return createServer(this.options, this.callback)
  }

  listen (...args: HttpServerListenParameters): Server {
    return super.listen(...args)
  }
}

const Rui = (options?: RuiOptions) => {
  return new HttpApp(options) as RuiInstance
}

export type { Next, RuiOptions, Context, Middleware, ValidationRule, Router, RuiInstance }
export { Validator }
export default Rui
