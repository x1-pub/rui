import { createServer, Http2Server } from 'node:http2'

import App from '../core/index.js'
import type { Http2Request, Http2Response, Http2AppOptions, Http2Context, Next, Http2Middleware } from '../type'

type Http2ServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class Http2App extends App<Http2Request, Http2Response> {
  private options: Http2AppOptions

  constructor (options?: Http2AppOptions) {
    super(options)
    this.options = options || {}
  }

  listen = (...args: Http2ServerListenParameters): Http2Server => {
    const server = createServer(this.options, this.callback)
    return server.listen(...args)
  }
}

export type { Http2Request, Http2Response, Http2AppOptions, Http2Context, Next, Http2Middleware }
export default Http2App
