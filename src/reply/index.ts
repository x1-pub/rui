import mime from 'mime-types'
import http from 'node:http'
import { CommonRequest, CommonResponse, Context, ResponseData } from '../type.js'

abstract class ReplyResolver {
  /**
   * 确定响应的 Content-Type
   */
  static contentType = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>): string | undefined => {
    // 检查是否已显式设置 content-type
    const explicitType = ctx.res.getHeader('content-type')
    if (explicitType) {
      const typeString = Array.isArray(explicitType) ? explicitType[0] : String(explicitType)
      // 验证 MIME 类型是否有效
      const parsedType = mime.contentType(typeString)
      if (parsedType) {
        return parsedType
      }
      console.warn(`设置了无效的 Content-Type: ${typeString}`)
    }

    // 根据响应数据类型自动推断 Content-Type
    return this.inferContentType(ctx.responseData)
  }

  /**
   * 根据数据类型推断 Content-Type
   */
  private static inferContentType (data: ResponseData): string | undefined {
    if (data === null || data === undefined) {
      return undefined
    }

    switch (typeof data) {
      case 'string':
        // 尝试检测是否为 HTML
        if (this.isHtmlString(data)) {
          return 'text/html; charset=utf-8'
        }
        // 尝试检测是否为 JSON 字符串
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
        // 对象类型默认为 JSON
        return 'application/json; charset=utf-8'

      case 'function':
      case 'symbol':
        return 'text/plain; charset=utf-8'

      default:
        return 'text/plain; charset=utf-8'
    }
  }

  /**
   * 检测字符串是否为 HTML
   */
  private static isHtmlString (str: string): boolean {
    const trimmed = str.trim()
    return trimmed.startsWith('<!DOCTYPE') ||
           trimmed.startsWith('<html') ||
           /<\/?[a-z][\s\S]*>/i.test(trimmed)
  }

  /**
   * 检测字符串是否为 JSON
   */
  private static isJsonString (str: string): boolean {
    const trimmed = str.trim()
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
           (trimmed.startsWith('[') && trimmed.endsWith(']'))
  }

  /**
   * 确定响应状态码
   */
  static status = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>): number => {
    let statusCode = ctx.res.statusCode

    // 验证状态码是否有效
    if (!this.isValidStatusCode(statusCode)) {
      console.warn(`设置了无效的状态码: ${statusCode}，使用默认值 200`)
      statusCode = 200
    }

    // 如果状态码不是默认的 200，直接返回
    if (statusCode !== 200) {
      return statusCode
    }

    // 根据响应数据自动推断状态码
    return this.inferStatusCode(ctx.responseData)
  }

  /**
   * 验证状态码是否有效
   */
  private static isValidStatusCode (code: number): boolean {
    return typeof code === 'number' &&
           code >= 100 &&
           code <= 599 &&
           Object.prototype.hasOwnProperty.call(http.STATUS_CODES, code)
  }

  /**
   * 根据响应数据推断状态码
   */
  private static inferStatusCode (data: ResponseData): number {
    // 如果没有响应数据，返回 404
    if (data === null || data === undefined) {
      return 404
    }

    // 空字符串也视为无内容
    if (typeof data === 'string' && data.trim() === '') {
      return 204 // No Content
    }

    // 有数据则返回 200
    return 200
  }

  /**
   * 序列化响应数据
   */
  static data = <T extends CommonRequest, D extends CommonResponse>(ctx: Context<T, D>): string | Buffer | null => {
    const { responseData } = ctx

    if (responseData === null || responseData === undefined) {
      return null
    }

    try {
      return this.serializeData(responseData)
    } catch (error) {
      console.error('序列化响应数据失败:', error)
      // 返回错误信息
      const errorResponse = {
        error: 'Internal Server Error',
        message: '响应数据序列化失败'
      }
      return JSON.stringify(errorResponse)
    }
  }

  /**
   * 序列化不同类型的数据
   */
  private static serializeData (data: ResponseData): string | Buffer | null {
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

        // 处理特殊对象类型
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

        // 默认 JSON 序列化
        return JSON.stringify(data, this.jsonReplacer, 2)

      default:
        return String(data)
    }
  }

  /**
   * JSON 序列化的替换函数，处理特殊值
   */
  private static jsonReplacer (key: string, value: any): any {
    // 处理 BigInt
    if (typeof value === 'bigint') {
      return value.toString()
    }

    // 处理函数
    if (typeof value === 'function') {
      return value.toString()
    }

    // 处理 Symbol
    if (typeof value === 'symbol') {
      return value.toString()
    }

    // 处理 undefined
    if (value === undefined) {
      return null
    }

    // 处理循环引用
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

  /**
   * 获取响应的字节长度
   */
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

  /**
   * 设置缓存相关头部
   */
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

  /**
   * 设置 CORS 头部
   */
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

    // 设置允许的源
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
