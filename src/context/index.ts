import url from 'node:url'
import type { TLSSocket } from 'node:tls'

import type { HttpContext, Http2Context, HttpsContext } from '../type'

const context = {
  get pathname () {
    const parsedUrl = url.parse(this.req.url || '/', true)
    return parsedUrl.pathname
  },
} as HttpContext & Http2Context & HttpsContext

export default context
