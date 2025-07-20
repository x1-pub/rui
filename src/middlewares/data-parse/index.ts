import { Buffer } from 'node:buffer';
import formidable from 'formidable';
import type { Request, Response, Next, Context } from "../../type"

const defaultJsonTypes = [
  'application/json',
  'application/json-patch+json',
  'application/vnd.api+json',
  'application/csp-report',
  'application/reports+json',
  'application/scim+json',
];

const getContentType = (type: string) => {
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
}

const collectBody = (req: Request): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    // TODO: limit
    const limit = 1024 * 1024

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;

      if (size > limit) {
        reject('Payload too large');
      }
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

const parseText = async (req: Request) => {
  const buffer = await collectBody(req);

  // TODO: encoding
  return buffer.toString('utf-8');
}

const parseJson = async (req: Request) => {
  const buffer = await collectBody(req);

  // TODO: encoding
  const content = buffer.toString('utf-8');

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    throw new Error('Invalid JSON payload')
  }
}

const parseForm = async (req: Request) => {
  const buffer = await collectBody(req);

  // TODO: encoding
  const content = buffer.toString('utf-8');
  const searchParams = [...new URLSearchParams(content).entries()]
  const queryObject: Record<string, undefined | string | string[]> = {}
  for (const [key, value] of searchParams) {
    if (!queryObject[key]) {
      queryObject[key] = value
      continue
    }

    queryObject[key] = [value, ...queryObject[key]]
  }
  return queryObject
}

const parseMultipart = async (req: Request) => {
  const form = formidable({ multiples: true });

  // @ts-expect-error Http2ServerRequest 缺少的 headersDistinct trailersDistinct 用不到
  const [fields, files] = await form.parse(req);

  return { fields, files }
}

const dataParser = async <T extends Request, D extends Response>(ctx: Context<T, D>, next: Next) => {
  const contentType = getContentType(ctx.req.headers['content-type'] || '')

  let data: unknown
  if (contentType === 'text') {
    data = await parseText(ctx.req)
  } else if (contentType === 'json') {
    data = await parseJson(ctx.req)
    ctx.data = data
  } else if (contentType === 'form') {
    data = await parseForm(ctx.req)
    ctx.data = data
  } else if (contentType === 'multipart') {
    data = await parseMultipart(ctx.req)
    ctx.data = data
  } else {
    data = await collectBody(ctx.req);
  }
  ctx.data = data

  await next()
}

export default dataParser
