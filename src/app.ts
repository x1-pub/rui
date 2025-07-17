import http from 'node:http'
import https from 'node:https'
import http2 from 'node:http2'
import EventEmitter from 'node:events'

import context from './context.js'
import type { Context } from './context.js'

type Middleware<T, D> = (ctx: Context<T, D>, next: () => Promise<void>) => Promise<void> | void;

class HttpApp<RequestType extends http.IncomingMessage | http2.Http2ServerRequest, ResponseType extends http.ServerResponse | http2.Http2ServerResponse> extends EventEmitter {
  private context: Context<RequestType, ResponseType>
  private middlewares: Middleware<RequestType, ResponseType>[]

  constructor (options?: http.ServerOptions | https.ServerOptions | http2.SecureServerOptions) {
    super()
    this.middlewares = []
    this.context = Object.create(context) as Context<RequestType, ResponseType>
  }

  callback = (req: RequestType, res: ResponseType) => {
    const ctx = Object.create(this.context) as Context<RequestType, ResponseType>
    ctx.req = req
    ctx.res = res

    return this.handleRequest(ctx)
  }

  compose = (ctx: Context<RequestType, ResponseType>) => {
    const dispatch = (i: number): Promise<void> => {
      if (this.middlewares.length === i) {
        return Promise.resolve()
      }

      const fn = this.middlewares[i]
      return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
    }

    return dispatch(0)
  }

  handleRequest = async (ctx: Context<RequestType, ResponseType>) => {
    this.compose(ctx)
      .then(() => this.handleResponse(ctx))
      .catch(err => console.log(err))
  }

  handleResponse = (ctx: Context<RequestType, ResponseType>) => {
    ctx.res.statusCode = 404

    if (!ctx.res.writable || ctx.body == null) {
      ctx.res.end()
    }

    ctx.res.statusCode = 200
    ctx.res.end(ctx.body)
  }

  use = (fn: Middleware<RequestType, ResponseType>) => {
    if (typeof fn !== 'function') {
      throw new Error('middleware must be a function!')
    }
    this.middlewares.push(fn)
    return this
  }
}

export default HttpApp
