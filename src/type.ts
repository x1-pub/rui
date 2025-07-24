import cookie from 'cookie'
import http from 'node:http'
import http2 from 'node:http2'
import https from 'node:https'

// 服务器选项类型
export type HttpAppOptions = http.ServerOptions
export type Http2AppOptions = http2.ServerOptions
export type Http2sAppOptions = http2.SecureServerOptions
export type HttpsAppOptions = https.ServerOptions
export type AppOptions = HttpAppOptions | Http2AppOptions | Http2sAppOptions | HttpsAppOptions

// 请求类型
export type HttpRequest = http.IncomingMessage
export type Http2Request = http2.Http2ServerRequest
export type Http2sRequest = http2.Http2ServerRequest // 与 Http2Request 相同
export type HttpsRequest = http.IncomingMessage
export type CommonRequest = HttpRequest | Http2Request | HttpsRequest

// 响应类型
export type HttpResponse = http.ServerResponse
export type Http2Response = http2.Http2ServerResponse
export type Http2sResponse = http2.Http2ServerResponse // 与 Http2Response 相同
export type HttpsResponse = http.ServerResponse
export type CommonResponse = HttpResponse | Http2Response | HttpsResponse

// 增强的类型安全性
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
  responseData: ResponseData;
  send: (chunk: ResponseData) => this;
  html: (data: string) => this;
  json: (data: object) => this;
  text: (data: string) => this;
  code: (statusCode: number) => this;
  setHeader: (name: string, value: number | string | readonly string[]) => void;
  setHeaders: (headers: Record<string, number | string | readonly string[]>) => void;
  setCookie: (name: string, val: string, options?: cookie.SerializeOptions) => void;
  getCookie: (name: string) => string | undefined;
  getCookies: () => Record<string, string | undefined>;
  deleteCookie: (name: string) => void;
  clearCookie: () => void;
  redirect: (url: string, statusCode?: 301 | 302) => void;
}

// 简化上下文类型定义
export type HttpContext = Context<HttpRequest, HttpResponse>
export type Http2Context = Context<Http2Request, Http2Response>
export type Http2sContext = Context<Http2sRequest, Http2sResponse>
export type HttpsContext = Context<HttpsRequest, HttpsResponse>

export type Next = () => Promise<void>

// 增强中间件类型安全性
export interface Middleware<T extends CommonRequest, D extends CommonResponse> {
  (ctx: Context<T, D>, next: Next): Promise<void> | void;
}

export type HttpMiddleware = Middleware<HttpRequest, HttpResponse>
export type Http2Middleware = Middleware<Http2Request, Http2Response>
export type Http2sMiddleware = Middleware<Http2sRequest, Http2sResponse>
export type HttpsMiddleware = Middleware<HttpsRequest, HttpsResponse>

// Hook 类型优化
export type HookType = 'onRequest' | 'onPreParsing' | 'onPreHandler' | 'onPreSerialization' | 'onPreResponse' | 'onResponse' | 'onError'

export type HookFunction<T extends CommonRequest, D extends CommonResponse> = 
  (ctx: Context<T, D>) => Promise<void> | void

export type ErrorHookFunction<T extends CommonRequest, D extends CommonResponse> = 
  (ctx: Context<T, D>, err: Error) => Promise<void> | void

export interface AddHookFunction<T extends CommonRequest, D extends CommonResponse, U> {
  (name: Exclude<HookType, 'onError'>, fn: HookFunction<T, D>): U;
  (name: 'onError', fn: ErrorHookFunction<T, D>): U;
}

// 插件类型优化
export interface PluginOptions {
  prefix?: string;
  [key: string]: unknown;
}

export interface Plugin<U> {
  (app: U, options: PluginOptions): Promise<void> | void;
}

// HTTP 方法类型
export type HttpMethod = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put' | 'options'

// 路由处理器类型
export type RouteHandler<T extends CommonRequest, D extends CommonResponse> = 
  (ctx: Context<T, D>) => Promise<void> | void

export interface RouteFunction<T extends CommonRequest, D extends CommonResponse> {
  (path: string, ...middlewares: [...Middleware<T, D>[], RouteHandler<T, D>]): void;
}

// 错误类型
export class RuiError extends Error {
  public statusCode: number;
  public code?: string;
  
  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'RuiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// 配置类型
export interface GlobalConfig {
  bodyLimit?: number;
  timeout?: number;
  encoding?: BufferEncoding;
  trustProxy?: boolean;
}