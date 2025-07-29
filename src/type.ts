import cookie from 'cookie'
import http from 'node:http'
import http2 from 'node:http2'
import https from 'node:https'

interface GlobalConfig {
  bodyLimit?: number;
  timeout?: number;
  encoding?: BufferEncoding;
  trustProxy?: boolean;
}

export type HttpAppOptions = http.ServerOptions & Partial<GlobalConfig>
export type Http2AppOptions = http2.ServerOptions & Partial<GlobalConfig>
export type Http2sAppOptions = http2.SecureServerOptions & Partial<GlobalConfig>
export type HttpsAppOptions = https.ServerOptions & Partial<GlobalConfig>
export type AppOptions = HttpAppOptions | Http2AppOptions | Http2sAppOptions | HttpsAppOptions

export type HttpRequest = http.IncomingMessage
export type Http2Request = http2.Http2ServerRequest
export type CommonRequest = HttpRequest | Http2Request

export type HttpResponse = http.ServerResponse
export type Http2Response = http2.Http2ServerResponse
export type CommonResponse = HttpResponse | Http2Response

export type RequestBody =
  | string
  | Record<string, unknown>
  | Buffer
  | { fields: any; files: any }
  | null

export type ResponseData =
  | string
  | number
  | boolean
  | object
  | Buffer
  | null
  | undefined

export interface Context<T extends CommonRequest, D extends CommonResponse> {
  req: T;
  res: D;
  protocol: 'http' | 'https';
  ip: string;
  pathname: string;
  query: Record<string, undefined | string | string[]>;
  host: string;
  params: Record<string, string>;
  body: RequestBody;
  acceptsJson: boolean;
  acceptsHtml: boolean;
  userAgent: boolean;
  isAjax: boolean;
  _responseData: ResponseData;
  send: (chunk: ResponseData) => this;
  html: (data: string) => this;
  json: (data: object) => this;
  text: (data: string) => this;
  code: (statusCode: number) => this;
  setHeader: (name: string, value: number | string | readonly string[]) => void;
  removeHeader: (name: string) => void;
  setHeaders: (headers: Record<string, number | string | readonly string[]>) => void;
  setCookie: (name: string, val: string, options?: cookie.SerializeOptions) => void;
  getCookie: (name: string) => string | undefined;
  getCookies: () => Record<string, string | undefined>;
  deleteCookie: (name: string) => void;
  clearCookie: () => void;
  redirect: (url: string, statusCode?: 301 | 302) => void;
}

export type HttpContext = Context<HttpRequest, HttpResponse>
export type Http2Context = Context<Http2Request, Http2Response>

export type Next = () => Promise<void>
export interface Middleware<T extends CommonRequest, D extends CommonResponse> {
  (ctx: Context<T, D>, next: Next): Promise<void> | void;
}
export type HttpMiddleware = Middleware<HttpRequest, HttpResponse>
export type Http2Middleware = Middleware<Http2Request, Http2Response>

export type HookType = 'onRequest' | 'onPreParsing' | 'onPreHandler' | 'onPreSerialization' | 'onPreResponse' | 'onResponse' | 'onError'
export type HookFunction<T extends CommonRequest, D extends CommonResponse> =
  (ctx: Context<T, D>) => Promise<void> | void
export type ErrorHookFunction<T extends CommonRequest, D extends CommonResponse> =
  (ctx: Context<T, D>, err: Error) => Promise<void> | void
export interface AddHook<T extends CommonRequest, D extends CommonResponse, U> {
  (name: Exclude<HookType, 'onError'>, fn: HookFunction<T, D>): U;
  (name: 'onError', fn: ErrorHookFunction<T, D>): U;
}

export interface PluginOptions {
  prefix?: string;
  [key: string]: unknown;
}
export interface Plugin<U> {
  (app: U, options: PluginOptions): Promise<void> | void;
}

export type HttpMethod = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put' | 'options'

export type RouteHandler<T extends CommonRequest, D extends CommonResponse> =
  (ctx: Context<T, D>) => Promise<void> | void

export interface RouteFunction<T extends CommonRequest, D extends CommonResponse> {
  (path: string, ...middlewares: [...Middleware<T, D>[], RouteHandler<T, D>]): void;
}
