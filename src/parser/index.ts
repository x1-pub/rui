import { Buffer } from 'node:buffer'
import formidable from 'formidable'
import type { Files, Fields } from 'formidable'
import url from 'node:url'
import type { CommonRequest, CommonResponse, Context, RequestBody } from '../type'
import { RuiError } from '../error/index.js'

const defaultJsonTypes = [
  'application/json',
  'application/json-patch+json',
  'application/vnd.api+json',
  'application/csp-report',
  'application/reports+json',
  'application/scim+json'
]

interface ParserConfig {
  bodyLimit: number;
  encoding: BufferEncoding;
}

const getContentType = (type: string): string | undefined => {
  if (defaultJsonTypes.includes(type)) {
    return 'json'
  }

  if (type.startsWith('application/x-www-form-urlencoded')) {
    return 'form'
  }

  if (type.startsWith('text/')) {
    return 'text'
  }

  if (type.startsWith('multipart/')) {
    return 'multipart'
  }

  return undefined
}

const collectBody = (req: CommonRequest, limit: number = 1024 * 1024): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      size += chunk.length

      if (size > limit) {
        const error = new RuiError('Payload too large', 413, 'PAYLOAD_TOO_LARGE')
        reject(error)
      }
    })

    req.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.on('aborted', () => {
      const error = new RuiError('Request aborted', 400, 'REQUEST_ABORTED')
      reject(error)
    })
  })
}

const parseText = async (req: CommonRequest, config: ParserConfig): Promise<string> => {
  const buffer = await collectBody(req, config.bodyLimit)
  return buffer.toString(config.encoding)
}

const parseJson = async (req: CommonRequest, config: ParserConfig): Promise<Record<string, unknown>> => {
  const buffer = await collectBody(req, config.bodyLimit)
  const content = buffer.toString(config.encoding)

  if (!content.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(content)
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('JSON must be an object')
    }
    return parsed as Record<string, unknown>
  } catch (err) {
    const error = new Error('Invalid JSON payload') as any
    error.statusCode = 400
    error.code = 'INVALID_JSON'
    error.originalError = err
    throw error
  }
}

const parseForm = async (req: CommonRequest, config: ParserConfig): Promise<Record<string, undefined | string | string[]>> => {
  const buffer = await collectBody(req, config.bodyLimit)
  const content = buffer.toString(config.encoding)

  if (!content.trim()) {
    return {}
  }

  try {
    const searchParams = new URLSearchParams(content)
    const queryObject: Record<string, undefined | string | string[]> = {}

    for (const [key, value] of searchParams.entries()) {
      if (!queryObject[key]) {
        queryObject[key] = value
      } else if (Array.isArray(queryObject[key])) {
        (queryObject[key] as string[]).push(value)
      } else {
        queryObject[key] = [queryObject[key] as string, value]
      }
    }

    return queryObject
  } catch (err) {
    const error = new Error('Invalid form data') as any
    error.statusCode = 400
    error.code = 'INVALID_FORM'
    error.originalError = err
    throw error
  }
}

const parseMultipart = async (req: CommonRequest, config: ParserConfig): Promise<{ fields: Fields; files: Files }> => {
  try {
    const form = formidable({
      multiples: true,
      maxFileSize: config.bodyLimit,
      maxTotalFileSize: config.bodyLimit
    })

    // @ts-expect-error
    // http2.Http2ServerRequest is missing headersDistinct trailersDistinct is not used
    const [fields, files] = await form.parse(req)

    return { fields, files }
  } catch (err) {
    const error = new RuiError('Invalid multipart data')
    error.statusCode = 400
    error.code = 'INVALID_MULTIPART'
    throw error
  }
}

const parseUrl = (req: CommonRequest): { pathname: string; query: Record<string, undefined | string | string[]> } => {
  try {
    const { query, pathname } = url.parse(req.url || '/', true)
    const queryObject: Record<string, undefined | string | string[]> = {}

    if (query && typeof query === 'object') {
      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
          queryObject[key] = value.filter(v => typeof v === 'string')
        } else if (typeof value === 'string') {
          queryObject[key] = value
        }
      }
    }

    return {
      pathname: pathname ? decodeURIComponent(pathname) : '/',
      query: queryObject
    }
  } catch (err) {
    const error = new Error('Invalid URL') as any
    error.statusCode = 400
    error.code = 'INVALID_URL'
    error.originalError = err
    throw error
  }
}

const parser = async <T extends CommonRequest, D extends CommonResponse>(
  ctx: Context<T, D>,
  config: ParserConfig = { bodyLimit: 1024 * 1024, encoding: 'utf-8' }
): Promise<{ pathname: string; query: Record<string, undefined | string | string[]>; body: RequestBody }> => {
  const { query, pathname } = parseUrl(ctx.req)

  const contentTypeHeader = ctx.req.headers['content-type'] || ''
  const contentType = getContentType(contentTypeHeader.split(';')[0].trim())

  let body: RequestBody = null

  if (contentType === 'text') {
    body = await parseText(ctx.req, config) as RequestBody
  } else if (contentType === 'json') {
    body = await parseJson(ctx.req, config) as RequestBody
  } else if (contentType === 'form') {
    body = await parseForm(ctx.req, config) as RequestBody
  } else if (contentType === 'multipart') {
    body = await parseMultipart(ctx.req, config) as RequestBody
  } else if (ctx.req.headers['content-length'] && parseInt(ctx.req.headers['content-length']) > 0) {
    // For requests of unknown type but with content length, read as Buffer.
    body = await collectBody(ctx.req, config.bodyLimit)
  }

  return {
    pathname,
    query,
    body
  }
}

export default parser
