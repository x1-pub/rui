import url from 'node:url'
import type { Request, Response, Next, Context } from "../../type"


const urlParser = async <T extends Request, D extends Response>(ctx: Context<T, D>, next: Next) => {
  const { query, pathname } = url.parse(ctx.req.url || '/')
  const searchParams = [...new URLSearchParams(query || '').entries()]

  const queryObject: Record<string, undefined | string | string[]> = {}
  for (const [key, value] of searchParams) {
    if (!queryObject[key]) {
      queryObject[key] = value
      continue
    }

    queryObject[key] = [value, ...queryObject[key]]
  }

  ctx.pathname = pathname || '/'
  ctx.query = queryObject

  await next()
}

export default urlParser
