import mime from 'mime-types'
import http from 'node:http'
import { CommonRequest, CommonResponse, Context } from '../type'

abstract class ReplyResolver {
  static contentType = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>) => {
    const explicitType = ctx.res.getHeader('content-type')
    if (explicitType) {
      const type = mime.extension(String(explicitType))
      if (type) {
        return
      }
      console.warn(`You set an invalid request header: ${explicitType}`)
    }

    let contentType: string | undefined

    switch (typeof ctx.responseData) {
      case 'function':
      case 'symbol':
      case 'bigint':
      case 'boolean':
      case 'number':
      case 'string':
        contentType = mime.lookup('text') || 'text/plain'
        break
      case 'object':
        if (Buffer.isBuffer(ctx.responseData)) {
          contentType = mime.lookup('bin') || 'application/octet-stream'
        } else if (ctx.responseData !== null) {
          contentType = mime.lookup('json') || 'application/json'
        }
    }

    return contentType
  }

  static status = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>) => {
    let explicitStatus = ctx.res.statusCode
    if (!Object.prototype.hasOwnProperty.call(http.STATUS_CODES, explicitStatus)) {
      console.warn(`You set an invalid statusCode: ${explicitStatus}`)
      explicitStatus = 200
    }

    if (explicitStatus !== 200) {
      return explicitStatus
    }

    // 200: default or set 200
    return ctx.responseData == null ? 404 : 200
  }

  static data = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>) => {
    let responseData: string | Buffer | null = null

    switch (typeof ctx.responseData) {
      case 'function':
      case 'symbol':
      case 'bigint':
      case 'boolean':
      case 'number':
      case 'string':
        responseData = String(ctx.responseData)
        break
      case 'object':
        if (Buffer.isBuffer(ctx.responseData)) {
          responseData = ctx.responseData
        } else if (ctx.responseData != null) {
          responseData = JSON.stringify(ctx.responseData)
        }
    }
    return responseData
  }
}

export default ReplyResolver
