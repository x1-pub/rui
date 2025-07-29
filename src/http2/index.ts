import { createServer, Http2Server } from 'node:http2'
import ServerFactory from '../core/factory.js'
import type {
  Http2Request,
  Http2Response,
  Next,
  Http2AppOptions as RuiOptions,
  Http2Context as Context,
  Http2Middleware as Middleware
} from '../type'

type Http2ServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class Http2App extends ServerFactory<Http2Request, Http2Response, Http2Server, RuiOptions> {
  protected createServer (): Http2Server {
    return createServer(this.options, this.callback)
  }

  listen (...args: Http2ServerListenParameters): Http2Server {
    return super.listen(...args)
  }
}

export type { Next, RuiOptions, Context, Middleware }
export default Http2App
