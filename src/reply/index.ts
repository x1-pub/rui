import mime from 'mime-types'
import http from 'node:http'
import { CommonRequest, CommonResponse, Context, ResponseData } from '../type'

abstract class ReplyResolver {
  static contentType = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>): string | undefined => {
    const explicitType = ctx.res.getHeader('content-type')
    if (explicitType) {
      const typeString = Array.isArray(explicitType) ? explicitType[0] : String(explicitType)
      const parsedType = mime.contentType(typeString)
      if (parsedType) {
        return parsedType
      }
      console.warn(`设置了无效的 Content-Type: ${typeString}`)
    }

    return this.inferContentType(ctx._responseData)
  }


  private static inferContentType(data: ResponseData): string | undefined {
    if (data === null || data === undefined) {
      return undefined
    }

    switch (typeof data) {
      case 'string':
        if (this.isHtmlString(data)) {
          return 'text/html; charset=utf-8'
        }
        if (this.isJsonString(data)) {
          return 'application/json; charset=utf-8'
        }
        return 'text/plain; charset=utf-8'

      case 'number':
      case 'boolean':
      case 'bigint':
        return 'text/plain; charset=utf-8'

      case 'object':
        if (Buffer.isBuffer(data)) {
          return 'application/octet-stream'
        }
        return 'application/json; charset=utf-8'

      case 'function':
      case 'symbol':
        return 'text/plain; charset=utf-8'

      default:
        return 'text/plain; charset=utf-8'
    }
  }

  private static isHtmlString(str: string): boolean {
    const trimmed = str.trim()
    return trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      /<\/?[a-z][\s\S]*>/i.test(trimmed)
  }

  private static isJsonString(str: string): boolean {
    const trimmed = str.trim()
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
  }

  static status = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>): number => {
    let statusCode = ctx.res.statusCode

    if (!this.isValidStatusCode(statusCode)) {
      console.warn(`设置了无效的状态码: ${statusCode}，使用默认值 200`)
      statusCode = 200
    }

    if (statusCode !== 200) {
      return statusCode
    }

    return this.inferStatusCode(ctx._responseData)
  }

  private static isValidStatusCode(code: number): boolean {
    return typeof code === 'number' &&
      code >= 100 &&
      code <= 599 &&
      Object.prototype.hasOwnProperty.call(http.STATUS_CODES, code)
  }

  private static inferStatusCode(data: ResponseData): number {
    if (data === null || data === undefined) {
      return 404
    }

    if (typeof data === 'string' && data.trim() === '') {
      return 204
    }

    return 200
  }

  static data = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>): string | Buffer | null => {
    const { _responseData } = ctx

    if (_responseData === null || _responseData === undefined) {
      return null
    }

    try {
      return this.serializeData(_responseData)
    } catch (error) {
      console.error('序列化响应数据失败:', error)
      const errorResponse = {
        error: 'Internal Server Error',
        message: '响应数据序列化失败'
      }
      return JSON.stringify(errorResponse)
    }
  }

  private static serializeData(data: ResponseData): string | Buffer | null {
    switch (typeof data) {
      case 'string':
        return data

      case 'number':
      case 'boolean':
      case 'bigint':
      case 'symbol':
        return String(data)

      case 'function':
        return data.toString()

      case 'object':
        if (data === null) {
          return null
        }

        if (Buffer.isBuffer(data)) {
          return data
        }

        if (data instanceof Date) {
          return data.toISOString()
        }

        if (data instanceof Error) {
          return JSON.stringify({
            name: data.name,
            message: data.message,
            stack: data.stack
          })
        }

        return JSON.stringify(data, this.jsonReplacer, 2)

      default:
        return String(data)
    }
  }

  private static jsonReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
      return value.toString()
    }

    if (typeof value === 'function') {
      return value.toString()
    }

    if (typeof value === 'symbol') {
      return value.toString()
    }

    if (value === undefined) {
      return null
    }

    if (typeof value === 'object' && value !== null) {
      if (this.seenObjects && this.seenObjects.has(value)) {
        return '[Circular Reference]'
      }
      if (!this.seenObjects) {
        this.seenObjects = new WeakSet()
      }
      this.seenObjects.add(value)
    }

    return value
  }

  private static seenObjects?: WeakSet<object>

  static getContentLength = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>): number => {
    const data = this.data(ctx)

    if (!data) {
      return 0
    }

    if (Buffer.isBuffer(data)) {
      return data.length
    }

    return Buffer.byteLength(data, 'utf8')
  }

  static setCacheHeaders = <T extends CommonRequest, D extends CommonResponse>(
    ctx: Context<T, D>,
    options: {
      maxAge?: number;
      etag?: string;
      lastModified?: Date;
      noCache?: boolean;
    } = {}
  ): void => {
    const { maxAge, etag, lastModified, noCache } = options

    if (noCache) {
      ctx.setHeader('cache-control', 'no-cache, no-store, must-revalidate')
      ctx.setHeader('pragma', 'no-cache')
      ctx.setHeader('expires', '0')
      return
    }

    if (maxAge !== undefined) {
      ctx.setHeader('cache-control', `public, max-age=${maxAge}`)
    }

    if (etag) {
      ctx.setHeader('etag', etag)
    }

    if (lastModified) {
      ctx.setHeader('last-modified', lastModified.toUTCString())
    }
  }

  static setCorsHeaders = <T extends CommonRequest, D extends CommonResponse>(
    ctx: Context<T, D>,
    options: {
      origin?: string | string[];
      methods?: string[];
      headers?: string[];
      credentials?: boolean;
      maxAge?: number;
    } = {}
  ): void => {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers = ['Content-Type', 'Authorization'],
      credentials = false,
      maxAge = 86400
    } = options

    if (Array.isArray(origin)) {
      const requestOrigin = ctx.req.headers.origin
      if (requestOrigin && origin.includes(requestOrigin)) {
        ctx.setHeader('access-control-allow-origin', requestOrigin)
      }
    } else {
      ctx.setHeader('access-control-allow-origin', origin)
    }

    ctx.setHeader('access-control-allow-methods', methods.join(', '))
    ctx.setHeader('access-control-allow-headers', headers.join(', '))
    ctx.setHeader('access-control-max-age', maxAge.toString())

    if (credentials) {
      ctx.setHeader('access-control-allow-credentials', 'true')
    }
  }
}

export default ReplyResolver
