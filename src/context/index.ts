import cookie from 'cookie'
import http from 'node:http'
import type { TLSSocket } from 'node:tls'
import type { HttpContext, Http2Context, HttpsContext } from '../type'

const context = {
  responseData: null,

  get protocol () {
    return this.req.headers['x-forwarded-proto'] || (this.req.socket as TLSSocket).encrypted ? 'https' : 'http'
  },

  get host () {
    const h = this.req.headers['x-forwarded-host'] || this.req.headers.host || ''
    if (!h) {
      console.warn('The host is not obtained from the request header')
    }
    return h
  },

  code (statusCode) {
    if (Object.prototype.hasOwnProperty.call(http.STATUS_CODES, statusCode)) {
      this.res.statusCode = statusCode
      return this
    }

    console.warn(`You set an invalid status code: ${statusCode}, now keep the status code ${this.res.statusCode}`)
    return this
  },

  send (chunk) {
    this.responseData = chunk
    return this
  },

  setHeader (name, value) {
    this.res.setHeader(name, value)
  },

  /**
   * The attribute setHeaders does not exist in Http2ServerResponse,
   * so setHeader is called in a loop
   */
  setHeaders (headers) {
    for (const [name, value] of Object.entries(headers)) {
      this.res.setHeader(name, value)
    }
  },

  setCookie (name, value, options) {
    const cookieString = cookie.serialize(name, value, options)
    const existingCookies = this.res.getHeader('set-cookie') || ''
    const newCookies = Array.isArray(existingCookies)
      ? [...existingCookies, cookieString]
      : [String(existingCookies), cookieString]
    this.setHeader('set-cookie', newCookies)
  },

  getCookie (name) {
    return this.getCookies()[name]
  },

  getCookies () {
    const cookieHeader = this.req.headers.cookie || ''
    return cookie.parse(cookieHeader)
  },

  deleteCookie (name: string) {
    this.setCookie(name, '', {
      expires: new Date(0),
      maxAge: -1
    })
  },

  clearCookie () {
    const cookies = this.getCookies()
    Object.keys(cookies).forEach(name => {
      this.deleteCookie(name)
    })
  }
} as HttpContext & Http2Context & HttpsContext

export default context
