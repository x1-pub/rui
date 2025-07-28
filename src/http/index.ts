import { createServer, Server } from 'node:http'
import ServerFactory from '../core/factory.js'
import type {
  HttpRequest,
  HttpResponse,
  Next,
  HttpAppOptions as RuiOptions,
  HttpContext as Context,
  HttpMiddleware as Middleware,
} from '../type'

type HttpServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class HttpApp extends ServerFactory<HttpRequest, HttpResponse, Server, RuiOptions> {
  protected createServer (): Server {
    return createServer(this.options, this.callback)
  }

  listen (...args: HttpServerListenParameters): Server {
    return super.listen(...args)
  }
}

export type { Next,  RuiOptions, Context, Middleware }
export default HttpApp
