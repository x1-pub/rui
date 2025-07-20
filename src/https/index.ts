import { createServer, Server } from 'node:https'

import App from '../core/index.js'
import type { HttpsRequest, HttpsResponse, HttpsAppOptions, HttpsContext, Next, HttpsMiddleware } from '../type'

type HttpsServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class HttpsApp extends App<HttpsRequest, HttpsResponse> {
  private options: HttpsAppOptions

  constructor (options?: HttpsAppOptions) {
    super(options)
    this.options = options || {}
  }

  listen = (...args: HttpsServerListenParameters): Server => {
    const server = createServer(this.options, this.callback)
    return server.listen(...args)
  }
}

export type { HttpsRequest, HttpsResponse, HttpsAppOptions, HttpsContext, Next, HttpsMiddleware }
export default HttpsApp
