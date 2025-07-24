import cookie from 'cookie'
import http from 'node:http'
import http2 from 'node:http2'
import https from 'node:https'

export type HttpAppOptions = http.ServerOptions
export type Http2AppOptions = http2.ServerOptions
export type Http2sAppOptions = http2.SecureServerOptions
export type HttpsAppOptions = https.ServerOptions
export type AppOptions = HttpAppOptions | Http2AppOptions | Http2sAppOptions | HttpsAppOptions

export type HttpRequest = http.IncomingMessage
export type Http2Request = http2.Http2ServerRequest
export type Http2sRequest = http2.Http2ServerRequest
export type HttpsRequest = http.IncomingMessage
export type CommonRequest = HttpRequest | Http2Request | Http2sRequest | HttpsRequest

export type HttpResponse = http.ServerResponse
export type Http2Response = http2.Http2ServerResponse
export type Http2sResponse = http2.Http2ServerResponse
export type HttpsResponse = http.ServerResponse
export type CommonResponse = HttpResponse | Http2Response | Http2sResponse | HttpsResponse

export interface Context<T extends CommonRequest, D extends CommonResponse> {
  req: T;
  res: D;
  protocol: 'http' | 'https';
  pathname: string;
  query: Record<string, undefined | string | string[]>;
  host: string;
  params: Record<string, string>;
  body: unknown;
  responseData: unknown;
  send: (chunk: any) => this;
  code: (statusCode: number) => this;
  setHeader: (name: string, value: number | string | readonly string[]) => void;
  setHeaders: (headers: Record<string, number | string | readonly string[]>) => void;
  setCookie: (name: string, val: string, options?: cookie.SerializeOptions) => void;
  getCookie: (name: string) => string | undefined;
  getCookies: () => Record<string, string | undefined>;
  deleteCookie: (name: string) => void;
  clearCookie: () => void;
}

export type HttpContext = Context<HttpRequest, HttpResponse>
export type Http2Context = Context<Http2Request, Http2Response>
export type Http2sContext = Context<Http2sRequest, Http2sResponse>
export type HttpsContext = Context<HttpsRequest, HttpsResponse>

export type Next = () => Promise<void>

export interface Middleware<T extends CommonRequest, D extends CommonResponse> {
  (ctx: Context<T, D>, next: Next): void;
}

export type HttpMiddleware = Middleware<HttpRequest, HttpResponse>
export type Http2Middleware = Middleware<Http2Request, Http2Response>
export type Http2sMiddleware = Middleware<Http2sRequest, Http2sResponse>
export type HttpsMiddleware = Middleware<HttpsRequest, HttpsResponse>

export type HookType = 'onRequest' | 'onPreParsing' | 'onPreHandler' | 'onPreSerialization' | 'onPreResponse' | 'onResponse' | 'onError'

export interface AddHookFunction<T extends CommonRequest, D extends CommonResponse, U> {
  (name: Exclude<HookType, 'onError'>, fn: (ctx: Context<T, D>) => void): U;
  (name: 'onError', fn: (ctx: Context<T, D>, err: Error) => void): U;
}

export interface Plugin<U> {
  (rui: U, options: PluginOptions): void;
}

export interface PluginOptions {
  prefix?: string;
}

export type HttpMethod = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put' |  'options'

export type RouteHandler<T extends CommonRequest, D extends CommonResponse> = (ctx: Context<T, D>) => void

export interface RouteFunction<T extends CommonRequest, D extends CommonResponse> {
  (path: string, ...middlewares: [...Middleware<T, D>[], RouteHandler<T, D>]): void;
}