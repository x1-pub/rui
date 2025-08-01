import { createServer, Server } from 'node:https'
import ServerFactory from '../core/factory.js'
import type {
  HttpRequest,
  HttpResponse,
  Next,
  HttpsAppOptions as RuiOptions,
  HttpContext as Context,
  HttpMiddleware as Middleware
} from '../type'

type HttpsServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

class HttpsApp extends ServerFactory<HttpRequest, HttpResponse, Server, RuiOptions> {
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

export type { Next, RuiOptions, Context, Middleware }
export default HttpsApp
