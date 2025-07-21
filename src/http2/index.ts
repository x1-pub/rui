import { createServer, Http2Server } from 'node:http2'

import App from '../core/index.js'
import type { Http2Request, Http2Response, Http2AppOptions, Http2Context, Next, Http2Middleware } from '../type'

type Http2ServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class Http2App extends App<Http2Request, Http2Response> {
  private option: Http2AppOptions

  constructor (option?: Http2AppOptions) {
    super(option)
    this.option = option || {}
  }

  listen = (...args: Http2ServerListenParameters): Http2Server => {
    const server = createServer(this.option, this.callback)
    server.on('listening', this.executePlugins)
    return server.listen(...args)
  }
}

export type { Http2Request, Http2Response, Http2AppOptions, Http2Context, Next, Http2Middleware }
export default Http2App
