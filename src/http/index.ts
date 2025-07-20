import { createServer, Server } from 'node:http'

import App from '../core/index.js'
import type { HttpRequest, HttpResponse, HttpAppOptions, HttpContext, Next, HttpMiddleware } from '../type'

type HttpServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class HttpApp extends App<HttpRequest, HttpResponse> {
  private options: HttpAppOptions

  constructor (options?: HttpAppOptions) {
    super(options)
    this.options = options || {}
  }

  listen = (...args: HttpServerListenParameters): Server => {
    const server = createServer(this.options, this.callback)
    return server.listen(...args)
  }
}

export type { HttpRequest, HttpResponse, HttpAppOptions, HttpContext, Next, HttpMiddleware }
export default HttpApp
