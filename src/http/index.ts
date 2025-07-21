import { createServer, Server } from 'node:http'

import App from '../core/index.js'
import type { HttpRequest, HttpResponse, HttpAppOptions, HttpContext, Next, HttpMiddleware } from '../type'

type HttpServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class HttpApp extends App<HttpRequest, HttpResponse> {
  private option: HttpAppOptions

  constructor (option?: HttpAppOptions) {
    super(option)
    this.option = option || {}
  }

  listen = (...args: HttpServerListenParameters): Server => {
    const server = createServer(this.option, this.callback)
    server.listen(...args)
    server.on('listening', this.executePlugins)
    return server
  }
}

export type { HttpRequest, HttpResponse, HttpAppOptions, HttpContext, Next, HttpMiddleware }
export default HttpApp
