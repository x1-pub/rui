import type { CommonRequest, CommonResponse, Context } from '../type'

export interface CorsOptions {
  /**
   * 允许的来源，可以是字符串、正则表达式、函数或数组
   * @default '*'
   */
  origin?: string | RegExp | ((origin: string) => string | boolean | Promise<string | boolean>) | (string | RegExp)[]
  /**
   * 允许的请求方法
   * @default 'GET,HEAD,PUT,POST,DELETE,PATCH'
   */
  methods?: string | string[]
  /**
   * 允许的请求头
   * @default undefined
   */
  allowHeaders?: string | string[]
  /**
   * 暴露的响应头
   * @default undefined
   */
  exposeHeaders?: string | string[]
  /**
   * 是否允许发送Cookie
   * @default false
   */
  credentials?: boolean
  /**
   * 预检请求的缓存时间，单位为秒
   * @default 0
   */
  maxAge?: number
  /**
   * 是否允许私有网络访问
   * @default false
   */
  privateNetworkAccess?: boolean
}

const defaultOptions: CorsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
  credentials: false,
  maxAge: 0
}

const dealOrigin = async (ctx: Context<CommonRequest, CommonResponse>, opts: CorsOptions) => {
  const requestOrigin = ctx.req.headers.origin!
  let origin: string | boolean = '*'

  if (typeof opts.origin === 'function') {
    origin = await opts.origin(requestOrigin)
    if (origin === false) {
      origin = ''
    } else if (origin === true) {
      origin = requestOrigin
    }
  } else if (opts.origin instanceof RegExp) {
    origin = opts.origin.test(requestOrigin) ? requestOrigin : false
    if (origin === false) {
      origin = ''
    }
  } else if (Array.isArray(opts.origin)) {
    const found = opts.origin.some(item => {
      if (item instanceof RegExp) {
        return item.test(requestOrigin)
      }
      return item === requestOrigin
    })
    origin = found ? requestOrigin : false
    if (origin === false) {
      origin = ''
    }
  } else if (opts.origin !== '*') {
    origin = opts.origin === requestOrigin ? requestOrigin : false
    if (origin === false) {
      origin = ''
    }
  }

  ctx.setHeader('Access-Control-Allow-Origin', origin)
}

const dealOptionsRequest = async (ctx: Context<CommonRequest, CommonResponse>, opts: CorsOptions) => {
  const methods = Array.isArray(opts.methods)
    ? opts.methods.join(',')
    : opts.methods
  ctx.setHeader('Access-Control-Allow-Methods', methods!)

  const requestHeaders = ctx.req.headers['access-control-request-headers']
  const allowHeaders = opts.allowHeaders
    ? Array.isArray(opts.allowHeaders)
      ? opts.allowHeaders.join(',')
      : opts.allowHeaders
    : requestHeaders || ''
  if (allowHeaders) {
    ctx.setHeader('Access-Control-Allow-Headers', allowHeaders)
  }

  if (opts.maxAge !== undefined && opts.maxAge !== null) {
    ctx.setHeader('Access-Control-Max-Age', opts.maxAge.toString())
  }
}

const cors = async (ctx: Context<CommonRequest, CommonResponse>, options: CorsOptions = {}) => {
  const requestOrigin = ctx.req.headers.origin
  if (!requestOrigin) {
    return
  }

  const opts = { ...defaultOptions, ...options }

  await dealOrigin(ctx, opts)

  if (opts.credentials === true) {
    ctx.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  if (opts.exposeHeaders) {
    const exposeHeaders = Array.isArray(opts.exposeHeaders)
      ? opts.exposeHeaders.join(',')
      : opts.exposeHeaders
    ctx.setHeader('Access-Control-Expose-Headers', exposeHeaders)
  }

  if (opts.privateNetworkAccess && ctx.req.headers['access-control-request-private-network']) {
    ctx.setHeader('Access-Control-Allow-Private-Network', 'true')
  }

  if (ctx.req.method === 'OPTIONS') {
    dealOptionsRequest(ctx, opts)
    ctx.code(204)
  }
}

export default cors
