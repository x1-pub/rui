import cookie from 'cookie'
import http from 'node:http'
import type { TLSSocket } from 'node:tls'
import type { HttpContext, Http2Context } from '../type'

const context = {
  _responseData: null,
  _configs: {},

  get method () {
    return this.req.method.toLowerCase()
  },

  get protocol () {
    const forwardedProto = this.req.headers['x-forwarded-proto']
    if (forwardedProto) {
      return forwardedProto === 'https' ? 'https' : 'http'
    }

    const socket = this.req.socket as TLSSocket
    return socket.encrypted ? 'https' : 'http'
  },

  get host () {
    const forwardedHost = this.req.headers['x-forwarded-host']
    const host = this.req.headers.host

    const result = forwardedHost || host || ''

    if (!result) {
      console.warn('Host information cannot be obtained from the request header.')
    }

    return Array.isArray(result) ? result[0] : result
  },

  code (statusCode) {
    if (typeof statusCode === 'number' && Object.prototype.hasOwnProperty.call(http.STATUS_CODES, statusCode)) {
      this.res.statusCode = statusCode
      return this
    }

    console.warn(`Set an invalid status code of ${statusCode} and keep the current status code of ${this.res.statusCode}.`)
    return this
  },

  send (chunk) {
    this._responseData = chunk
    return this
  },

  setHeader (name, value) {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('The header name must be a non-empty string.')
      return
    }

    this.res.setHeader(name.trim().toLowerCase(), value)
  },

  removeHeader (name) {
    this.res.removeHeader(name)
  },

  /**
   * The http2.Http2ServerResponse property does not exist,
   * so it calls setHeader in a loop.
   */
  setHeaders (headers) {
    if (!headers || Object.prototype.toString.call(headers) !== '[object Object]') {
      console.warn('headers must be an object.')
      return
    }

    for (const [name, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        this.setHeader(name, value)
      }
    }
  },

  setCookie (name, value, options) {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('The cookie name must be a non-null string.')
      return
    }

    if (typeof value !== 'string') {
      console.warn('The cookie value must be a string.')
      return
    }

    const cookieString = cookie.serialize(name, value, {
      httpOnly: true,
      secure: this.protocol === 'https',
      sameSite: 'lax',
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
  },

  getCookie (name) {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('The cookie name must be a non-null string.')
      return undefined
    }

    return this.getCookies()[name]
  },

  getCookies () {
    const cookieHeader = this.req.headers.cookie || ''
    return cookie.parse(Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader) || {}
  },

  deleteCookie (name) {
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('The cookie name must be a non-null string.')
      return
    }

    this.setCookie(name, '', {
      expires: new Date(0),
      maxAge: -1,
      path: '/'
    })
  },

  clearCookie () {
    const cookies = this.getCookies()
    Object.keys(cookies).forEach(name => {
      this.deleteCookie(name)
    })
  },

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
      console.warn('The redirect URL must be a non-null string.')
      return
    }

    this.code(statusCode)
    this.setHeader('location', url)
    this.send(null)
  },

  get ip () {
    const forwarded = this.req.headers['x-forwarded-for']
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded
      return ips.split(',')[0].trim()
    }

    const realIp = this.req.headers['x-real-ip']
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp
    }

    return this.req.socket.remoteAddress || ''
  },

  get userAgent () {
    const ua = this.req.headers['user-agent']
    return Array.isArray(ua) ? ua[0] : (ua || '')
  },

  get isAjax () {
    const requestedWith = this.req.headers['x-requested-with']
    return (Array.isArray(requestedWith) ? requestedWith[0] : requestedWith) === 'XMLHttpRequest'
  },

  get acceptsJson () {
    const accept = this.req.headers.accept
    const acceptHeader = Array.isArray(accept) ? accept[0] : (accept || '')
    return acceptHeader.includes('application/json')
  },

  get acceptsHtml () {
    const accept = this.req.headers.accept
    const acceptHeader = Array.isArray(accept) ? accept[0] : (accept || '')
    return acceptHeader.includes('text/html')
  },

  getConfigs() {
    return this._configs
  }
} as HttpContext & Http2Context

export default context
