import http2 from 'node:http2'

import App from './base-app.js'

type Http2ServerListenParameters = Parameters<ReturnType<typeof http2.createSecureServer>['listen']>

class Http2App extends App<http2.Http2ServerRequest, http2.Http2ServerResponse> {
  private options: http2.SecureServerOptions

  constructor (options?: http2.SecureServerOptions) {
    super(options)
    this.options = options || {}
  }

  listen = (...args: Http2ServerListenParameters): http2.Http2SecureServer => {
    const server = http2.createSecureServer(this.options)
    return server.listen(...args)
  }
}

export default Http2App
