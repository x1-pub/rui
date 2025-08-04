import { createSecureServer, Http2SecureServer } from 'node:http2'
import ServerFactory from '../core/factory.js'
import validator from '../validator/index.js'
import type {
  Http2Request,
  Http2Response,
  Next,
  Http2sAppOptions as RuiOptions,
  Http2Context as Context,
  Http2Middleware as Middleware
} from '../type'
import type { ValidationRule } from '../validator/index.js'
import type HttpRouter from '../router/index.js'

type Http2sServerListenParameters = Parameters<ReturnType<typeof createSecureServer>['listen']>
type Router = HttpRouter<Http2Request, Http2Response>
interface RuiInstance extends Http2sApp {}

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

const Rui = (options?: RuiOptions) => {
  return new Http2sApp(options) as RuiInstance
}

export type { Next, RuiOptions, Context, Middleware, ValidationRule, Router, RuiInstance }
export { validator }
export default Rui
