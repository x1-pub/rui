import { createServer, Server } from 'node:http'
import ServerFactory from '../core/factory.js'
import type {
  HttpRequest,
  HttpResponse,
  HttpAppOptions,
  HttpContext,
  Next,
  HttpMiddleware,
} from '../type'

type HttpServerListenParameters = Parameters<ReturnType<typeof createServer>['listen']>

/**
 * HTTP 服务器应用类
 */
class HttpApp extends ServerFactory<HttpRequest, HttpResponse, Server, HttpAppOptions> {
  protected createServer (): Server {
    return createServer(this.options, this.callback)
  }

  listen (...args: HttpServerListenParameters): Server {
    return super.listen(...args)
  }

  /**
   * 创建 HTTPS 重定向中间件
   */
  httpsRedirect = (port: number = 443) => {
    return (ctx: HttpContext, next: Next) => {
      if (ctx.protocol === 'http') {
        const redirectUrl = `https://${ctx.host.replace(/:\d+$/, '')}${port !== 443 ? `:${port}` : ''}${ctx.req.url}`
        ctx.redirect(redirectUrl, 301)
        return
      }
      return next()
    }
  }

  /**
   * 静态文件服务中间件（简单实现）
   */
  static = (root: string, options: { maxAge?: number; index?: string } = {}) => {
    const { maxAge = 0, index = 'index.html' } = options

    return async (ctx: HttpContext, next: Next) => {
      if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') {
        return next()
      }

      // 这里可以实现静态文件服务逻辑
      // 为了简化，这里只是一个占位符
      console.log(`静态文件请求: ${ctx.pathname}, 根目录: ${root}`)
      return next()
    }
  }
}

export type { HttpRequest, HttpResponse, HttpAppOptions, HttpContext, Next, HttpMiddleware }
export default HttpApp
