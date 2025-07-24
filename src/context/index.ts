import cookie from 'cookie'
import http from 'node:http'
import type { TLSSocket } from 'node:tls'
import type { HttpContext, Http2Context, HttpsContext, ResponseData } from '../type.js'

const context = {
  responseData: null as ResponseData,

  get protocol (): 'http' | 'https' {
    // 检查代理头部
    const forwardedProto = this.req.headers['x-forwarded-proto']
    if (forwardedProto) {
      return forwardedProto === 'https' ? 'https' : 'http'
    }

    // 检查连接是否加密
    const socket = this.req.socket as TLSSocket
    return socket.encrypted ? 'https' : 'http'
  },

  get host (): string {
    // 优先级：x-forwarded-host > host
    const forwardedHost = this.req.headers['x-forwarded-host']
    const host = this.req.headers.host

    const result = forwardedHost || host || ''

    if (!result) {
      console.warn('无法从请求头中获取主机信息')
    }

    return Array.isArray(result) ? result[0] : result
  },

  code (statusCode: number) {
    // 验证状态码是否有效
    if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
      console.warn(`设置了无效的状态码: ${statusCode}，保持当前状态码 ${this.res.statusCode}`)
      return this
    }

    if (Object.prototype.hasOwnProperty.call(http.STATUS_CODES, statusCode)) {
      this.res.statusCode = statusCode
      return this
    }

    console.warn(`设置了无效的状态码: ${statusCode}，保持当前状态码 ${this.res.statusCode}`)
    return this
  },

  send (chunk: ResponseData) {
    this.responseData = chunk
    return this
  },

  setHeader (name: string, value: number | string | readonly string[]) {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('头部名称必须是非空字符串')
      return
    }

    try {
      this.res.setHeader(name.toLowerCase(), value)
    } catch (error) {
      console.warn(`设置头部失败: ${name}`, error)
    }
  },

  /**
   * Http2ServerResponse 不存在 setHeaders 属性，
   * 所以循环调用 setHeader
   */
  setHeaders (headers: Record<string, number | string | readonly string[]>) {
    if (!headers || typeof headers !== 'object') {
      console.warn('headers 必须是一个对象')
      return
    }

    for (const [name, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        this.setHeader(name, value)
      }
    }
  },

  setCookie (name: string, value: string, options?: cookie.SerializeOptions) {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('Cookie 名称必须是非空字符串')
      return
    }

    if (typeof value !== 'string') {
      console.warn('Cookie 值必须是字符串')
      return
    }

    try {
      const cookieString = cookie.serialize(name, value, {
        httpOnly: true, // 默认设置为 httpOnly 提高安全性
        secure: this.protocol === 'https', // HTTPS 下自动设置 secure
        sameSite: 'lax', // 默认 SameSite 策略
        ...options
      })

      const existingCookies = this.res.getHeader('set-cookie')
      let newCookies: string[]

      if (!existingCookies) {
        newCookies = [cookieString]
      } else if (Array.isArray(existingCookies)) {
        newCookies = [...existingCookies, cookieString]
      } else {
        newCookies = [String(existingCookies), cookieString]
      }

      this.setHeader('set-cookie', newCookies)
    } catch (error) {
      console.warn(`设置 Cookie 失败: ${name}`, error)
    }
  },

  getCookie (name: string): string | undefined {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('Cookie 名称必须是非空字符串')
      return undefined
    }

    return this.getCookies()[name]
  },

  getCookies (): Record<string, string | undefined> {
    try {
      const cookieHeader = this.req.headers.cookie || ''
      return cookie.parse(Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)
    } catch (error) {
      console.warn('解析 Cookie 失败', error)
      return {}
    }
  },

  deleteCookie (name: string) {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('Cookie 名称必须是非空字符串')
      return
    }

    this.setCookie(name, '', {
      expires: new Date(0),
      maxAge: -1,
      path: '/' // 确保删除所有路径下的 cookie
    })
  },

  clearCookie () {
    const cookies = this.getCookies()
    Object.keys(cookies).forEach(name => {
      this.deleteCookie(name)
    })
  },

  // 新增便利方法
  json (data) {
    this.setHeader('content-type', 'application/json; charset=utf-8')
    return this.send(data)
  },

  text (data) {
    this.setHeader('content-type', 'text/plain; charset=utf-8')
    return this.send(data)
  },

  html (data) {
    this.setHeader('content-type', 'text/html; charset=utf-8')
    return this.send(data)
  },

  redirect (url, statusCode: number = 302) {
    if (typeof url !== 'string' || !url.trim()) {
      console.warn('重定向 URL 必须是非空字符串')
      return this
    }

    this.code(statusCode)
    this.setHeader('location', url)
    this.send('')
  },

  // 获取客户端 IP
  get ip (): string {
    // 检查代理头部
    const forwarded = this.req.headers['x-forwarded-for']
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded
      return ips.split(',')[0].trim()
    }

    const realIp = this.req.headers['x-real-ip']
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp
    }

    // 回退到连接的远程地址
    return this.req.socket.remoteAddress || 'unknown'
  },

  // 获取用户代理
  get userAgent () {
    const ua = this.req.headers['user-agent']
    return Array.isArray(ua) ? ua[0] : (ua || '')
  },

  // 检查请求是否为 AJAX
  get isAjax () {
    const requestedWith = this.req.headers['x-requested-with']
    return (Array.isArray(requestedWith) ? requestedWith[0] : requestedWith) === 'XMLHttpRequest'
  },

  // 检查是否接受 JSON 响应
  get acceptsJson (): boolean {
    const accept = this.req.headers.accept
    const acceptHeader = Array.isArray(accept) ? accept[0] : (accept || '')
    return acceptHeader.includes('application/json')
  },

  // 检查是否接受 HTML 响应
  get acceptsHtml (): boolean {
    const accept = this.req.headers.accept
    const acceptHeader = Array.isArray(accept) ? accept[0] : (accept || '')
    return acceptHeader.includes('text/html')
  }
} as HttpContext & Http2Context & HttpsContext

export default context
