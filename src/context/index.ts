import type { TLSSocket } from 'node:tls'
import type { HttpContext, Http2Context, HttpsContext } from '../type'

const context = {
  get protocol () {
    return this.req.headers['x-forwarded-proto'] || (this.req.socket as TLSSocket).encrypted ? 'https' : 'http'
  },

  get host () {
    return this.req.headers['x-forwarded-host'] || this.req.headers.host
  }

  // TODO: set body writable?
} as HttpContext & Http2Context & HttpsContext

export default context
