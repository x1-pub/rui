import { createServer, Server } from 'node:https'
import ServerFactory from '../core/factory.js'
import type {
  HttpRequest,
  HttpResponse,
  HttpsAppOptions,
  HttpContext,
  Next,
  HttpMiddleware,
} from '../type'

type HttpsServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

/**
 * HTTPS 服务器应用类
 */
class HttpsApp extends ServerFactory<HttpRequest, HttpResponse, Server, HttpsAppOptions> {
  constructor (options?: HttpsAppOptions) {
    super(options)

    // HTTPS 需要证书配置
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

  /**
   * 强制 HTTPS 中间件
   */
  forceHttps = () => {
    return (ctx: HttpContext, next: Next) => {
      // 设置 HSTS 头部
      ctx.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains')
      return next()
    }
  }

  /**
   * 安全头部中间件
   */
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

    return (ctx: HttpContext, next: Next) => {
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

export type { HttpRequest, HttpResponse, HttpsAppOptions, HttpContext, Next, HttpMiddleware }
export default HttpsApp
