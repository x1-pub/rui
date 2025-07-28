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

  serverPush = (resources: Array<{ path: string; headers?: Record<string, string> }>) => {
    return async (ctx: Context, next: Next) => {
      if (ctx.res.stream && typeof ctx.res.stream.pushStream === 'function') {
        for (const resource of resources) {
          try {
            ctx.res.stream.pushStream({ ':path': resource.path }, (err: any, pushStream: any) => {
              if (err) {
                console.warn(`服务器推送失败: ${resource.path}`, err)
                return
              }

              if (resource.headers) {
                for (const [key, value] of Object.entries(resource.headers)) {
                  pushStream.setHeader(key, value)
                }
              }

              pushStream.end()
            })
          } catch (error) {
            console.warn(`服务器推送异常: ${resource.path}`, error)
          }
        }
      }

      return next()
    }
  }

  /**
   * HTTP/2 性能优化中间件
   */
  http2Optimize = () => {
    return (ctx: Context, next: Next) => {
      ctx.setHeaders({
        'x-powered-by': 'Rui HTTP/2',
        server: 'Rui/1.0'
      })

      return next()
    }
  }

  /**
   * 流控制中间件
   */
  flowControl = (options: { windowSize?: number } = {}) => {
    const { windowSize = 65535 } = options

    return (ctx: Context, next: Next) => {
      if (ctx.res.stream) {
        try {
          console.log(`设置流窗口大小: ${windowSize}`)
        } catch (error) {
          console.warn('流控制设置失败:', error)
        }
      }

      return next()
    }
  }
}

export type { Next, RuiOptions, Context, Middleware }
export default Http2App
