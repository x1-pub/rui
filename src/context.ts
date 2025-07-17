import http from 'node:http'
import http2 from 'node:http2'
import url from 'node:url'
import type { TLSSocket } from 'node:tls'

export interface Context<T, D> {
  req: T;
  res: D;
  pathname: string;
  query: any;
  body: any;
}

const context = {
  get pathname () {
    const parsedUrl = url.parse(this.req.url || '/', true)
    return parsedUrl.pathname
  },

  get query () {
    console.log(this.req.headers)
    console.log((this.req.socket as TLSSocket).encrypted)
    const parsedUrl = url.parse(this.req.url || '/', true)
    console.log(parsedUrl)
    return { ...parsedUrl.query }
  }
} as Context<http.IncomingMessage & http2.Http2ServerRequest, http.ServerResponse & http2.Http2ServerResponse>

export default context
