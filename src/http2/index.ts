import { createServer, Http2Server } from 'node:http2'
import ServerFactory from '../core/factory.js'
import Validator from '../validator/index.js'
import type {
  Http2Request,
  Http2Response,
  Next,
  Http2AppOptions as RuiOptions,
  Http2Context as Context,
  Http2Middleware as Middleware
} from '../type'
import type { ValidationRule } from '../validator/index.js'
import type HttpRouter from '../router/index.js'

type Http2ServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>
type Router = HttpRouter<Http2Request, Http2Response>
interface RuiInstance extends Http2App {}

class Http2App extends ServerFactory<Http2Request, Http2Response, Http2Server, RuiOptions> {
  protected createServer (): Http2Server {
    return createServer(this.options, this.callback)
  }

  listen (...args: Http2ServerListenParameters): Http2Server {
    return super.listen(...args)
  }
}

const Rui = (options?: RuiOptions) => {
  return new Http2App(options) as RuiInstance
}

export type { Next, RuiOptions, Context, Middleware, ValidationRule, Router, RuiInstance }
export { Validator }
export default Rui
