import { createServer, Server } from 'node:https'

import App from '../core/index.js'
import type { HttpsRequest, HttpsResponse, HttpsAppOptions, HttpsContext, Next, HttpsMiddleware } from '../type'

type HttpsServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class HttpsApp extends App<HttpsRequest, HttpsResponse> {
  private option: HttpsAppOptions

  constructor (option?: HttpsAppOptions) {
    super(option)
    this.option = option || {}
  }

  listen = (...args: HttpsServerListenParameters): Server => {
    const server = createServer(this.option, this.callback)
    server.on('listening', this.executePlugins)
    return server.listen(...args)
  }
}

export type { HttpsRequest, HttpsResponse, HttpsAppOptions, HttpsContext, Next, HttpsMiddleware }
export default HttpsApp
