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
      console.warn('HTTPS 服务器需要提供 key 和 cert 配置')
    }
  }

  protected createServer (): Server {
    return createServer(this.options, this.callback)
  }

  listen (...args: HttpsServerListenParameters): Server {
    return super.listen(...args)
  }

  forceHttps = () => {
    return (ctx: Context, next: Next) => {
      ctx.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains')
      return next()
    }
  }

  securityHeaders = (options: {
    contentSecurityPolicy?: string;
    xFrameOptions?: string;
    xContentTypeOptions?: boolean;
    referrerPolicy?: string;
  } = {}) => {
    const {
      contentSecurityPolicy = "default-src 'self'",
      xFrameOptions = 'DENY',
      xContentTypeOptions = true,
      referrerPolicy = 'strict-origin-when-cross-origin'
    } = options

    return (ctx: Context, next: Next) => {
      ctx.setHeaders({
        'content-security-policy': contentSecurityPolicy,
        'x-frame-options': xFrameOptions,
        'x-content-type-options': xContentTypeOptions ? 'nosniff' : '',
        'referrer-policy': referrerPolicy,
        'x-xss-protection': '1; mode=block'
      })
      return next()
    }
  }
}

export type { Next, RuiOptions, Context, Middleware }
export default HttpsApp
