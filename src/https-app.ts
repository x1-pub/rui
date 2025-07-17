import http from 'node:http'
import https from 'node:https'

import App from './app'

type HttpsServerListenParameters = Parameters<ReturnType<typeof https.createServer>['listen']>

class HttpsApp extends App<http.IncomingMessage, http.ServerResponse> {
  private options: https.ServerOptions

  constructor (options?: https.ServerOptions) {
    super(options)
    this.options = options || {}
  }

  listen = (...args: HttpsServerListenParameters): https.Server => {
    const server = https.createServer(this.options, this.callback)
    return server.listen(...args)
  }
}

export default HttpsApp
