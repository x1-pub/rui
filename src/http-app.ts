import http from 'node:http'

import App from './app'

type HttpServerListenParameters = Parameters<ReturnType<typeof http.createServer>['listen']>

class HttpApp extends App<http.IncomingMessage, http.ServerResponse> {
  private options: http.ServerOptions

  constructor (options?: http.ServerOptions) {
    super(options)
    this.options = options || {}
  }

  listen = (...args: HttpServerListenParameters): http.Server => {
    const server = http.createServer(this.options, this.callback)
    return server.listen(...args)
  }
}

export default HttpApp
