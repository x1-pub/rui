import { createSecureServer, Http2SecureServer } from 'node:http2'
import ServerFactory from '../core/factory.js'
import type {
  Http2Request,
  Http2Response,
  Next,
  Http2sAppOptions as RuiOptions,
  Http2Context as Context,
  Http2Middleware as Middleware,
} from '../type'

type Http2sServerListenParameters = Parameters<ReturnType<typeof createSecureServer>['listen']>

class Http2sApp extends ServerFactory<Http2Request, Http2Response, Http2SecureServer, RuiOptions> {
  constructor (options?: RuiOptions) {
    super(options)

    if (!options?.key || !options?.cert) {
      console.warn('HTTP/2 安全服务器需要提供 key 和 cert 配置')
    }
  }

  protected createServer (): Http2SecureServer {
    return createSecureServer(this.options, this.callback)
  }

  listen (...args: Http2sServerListenParameters): Http2SecureServer {
    return super.listen(...args)
  }

  /**
   * HTTP/2 安全服务器推送中间件
   */
  secureServerPush = (resources: Array<{ path: string; headers?: Record<string, string> }>) => {
    return async (ctx: Context, next: Next) => {
      if (ctx.res.stream && typeof ctx.res.stream.pushStream === 'function') {
        for (const resource of resources) {
          try {
            ctx.res.stream.pushStream({ ':path': resource.path }, (err: any, pushStream: any) => {
              if (err) {
                console.warn(`安全服务器推送失败: ${resource.path}`, err)
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
            console.warn(`安全服务器推送异常: ${resource.path}`, error)
          }
        }
      }

      return next()
    }
  }

  /**
   * 增强安全头部中间件
   */
  enhancedSecurity = (options: {
    contentSecurityPolicy?: string;
    strictTransportSecurity?: string;
    xFrameOptions?: string;
    xContentTypeOptions?: boolean;
    referrerPolicy?: string;
    permissionsPolicy?: string;
  } = {}) => {
    const {
      contentSecurityPolicy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      strictTransportSecurity = 'max-age=31536000; includeSubDomains; preload',
      xFrameOptions = 'DENY',
      xContentTypeOptions = true,
      referrerPolicy = 'strict-origin-when-cross-origin',
      permissionsPolicy = 'geolocation=(), microphone=(), camera=()'
    } = options

    return (ctx: Context, next: Next) => {
      ctx.setHeaders({
        'strict-transport-security': strictTransportSecurity,
        'content-security-policy': contentSecurityPolicy,
        'x-frame-options': xFrameOptions,
        'x-content-type-options': xContentTypeOptions ? 'nosniff' : '',
        'referrer-policy': referrerPolicy,
        'permissions-policy': permissionsPolicy,
        'x-xss-protection': '1; mode=block',
        'x-powered-by': 'Rui HTTP/2 Secure'
      })
      return next()
    }
  }

  /**
   * TLS 配置验证中间件
   */
  tlsValidation = () => {
    return (ctx: Context, next: Next) => {
      // 检查 TLS 连接信息
      const socket = ctx.req.socket as any
      if (socket.encrypted) {
        const cipher = socket.getCipher()
        const protocol = socket.getProtocol()

        // 记录 TLS 信息（可用于监控和调试）
        console.log(`TLS 连接信息 - 协议: ${protocol}, 加密套件: ${cipher?.name}`)

        // TODO: 添加 TLS 版本检查等安全验证
        if (protocol && protocol < 'TLSv1.2') {
          console.warn('检测到不安全的 TLS 版本:', protocol)
        }
      }

      return next()
    }
  }

  /**
   * HTTP/2 性能监控中间件
   */
  performanceMonitor = () => {
    return (ctx: Context, next: Next) => {
      const startTime = Date.now()

      ctx.res.on('finish', () => {
        const duration = Date.now() - startTime
        console.log(`请求处理时间: ${duration}ms - ${ctx.req.method} ${ctx.pathname}`)
      })

      return next()
    }
  }
}

export type { Next,  RuiOptions, Context, Middleware }
export default Http2sApp
