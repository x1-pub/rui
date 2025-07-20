import { createSecureServer, Http2SecureServer } from 'node:http2'

import App from '../core/index.js'
import type { Http2sRequest, Http2sResponse, Http2sAppOptions, Http2sContext, Next, Http2sMiddleware } from '../type'

type Http2sServerListenParameters = Parameters<ReturnType<typeof createSecureServer>['listen']>

class Http2sApp extends App<Http2sRequest, Http2sResponse> {
  private options: Http2sAppOptions

  constructor (options?: Http2sAppOptions) {
    super(options)
    this.options = options || {}
  }

  listen = (...args: Http2sServerListenParameters): Http2SecureServer => {
    const server = createSecureServer(this.options, this.callback)
    return server.listen(...args)
  }
}

export type { Http2sRequest, Http2sResponse, Http2sAppOptions, Http2sContext, Next, Http2sMiddleware }
export default Http2sApp
