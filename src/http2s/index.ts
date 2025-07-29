import { createSecureServer, Http2SecureServer } from 'node:http2'
import ServerFactory from '../core/factory.js'
import type {
  Http2Request,
  Http2Response,
  Next,
  Http2sAppOptions as RuiOptions,
  Http2Context as Context,
  Http2Middleware as Middleware
} from '../type'

type Http2sServerListenParameters = Parameters<ReturnType<typeof createSecureServer>['listen']>

class Http2sApp extends ServerFactory<Http2Request, Http2Response, Http2SecureServer, RuiOptions> {
  constructor (options?: RuiOptions) {
    super(options)

    if (!options?.key || !options?.cert) {
      console.warn('HTTP/2 secure server requires key and cert configuration.')
    }
  }

  protected createServer (): Http2SecureServer {
    return createSecureServer(this.options, this.callback)
  }

  listen (...args: Http2sServerListenParameters): Http2SecureServer {
    return super.listen(...args)
  }
}

export type { Next, RuiOptions, Context, Middleware }
export default Http2sApp
