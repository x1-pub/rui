import { createServer, Server } from 'node:https'
import ServerFactory from '../core/factory.js'
import validator from '../validator/index.js'
import type {
  HttpRequest,
  HttpResponse,
  Next,
  HttpsAppOptions as RuiOptions,
  HttpContext as Context,
  HttpMiddleware as Middleware
} from '../type'
import type { ValidationRule } from '../validator/index.js'
import type HttpRouter from '../router/index.js'

type HttpsServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>
type Router = HttpRouter<HttpRequest, HttpResponse>

class Rui extends ServerFactory<HttpRequest, HttpResponse, Server, RuiOptions> {
  constructor (options?: RuiOptions) {
    super(options)

    if (!options?.key || !options?.cert) {
      console.warn('HTTP secure server requires key and cert configuration')
    }
  }

  protected createServer (): Server {
    return createServer(this.options, this.callback)
  }

  listen (...args: HttpsServerListenParameters): Server {
    return super.listen(...args)
  }
}

export type { Next, RuiOptions, Context, Middleware, ValidationRule, Router }
export { validator }
export default Rui
