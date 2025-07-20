import EventEmitter from 'node:events'

import urlParser from '../middlewares/url-parse/index.js'
import context from '../context/index.js'
import type { Context, Middleware, Request, Response, AppOptions } from '../type'
import dataParser from '../middlewares/data-parse/index.js'

class HttpApp<RequestType extends Request, ResponseType extends Response> extends EventEmitter {
  private context: Context<RequestType, ResponseType>
  private middlewares: Middleware<RequestType, ResponseType>[]

  constructor (options?: AppOptions) {
    super()
    this.middlewares = [urlParser, dataParser]
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
    ctx.res.end(ctx.body as any)
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
