# Rui 框架优化总结

## 概述

本次优化对你的 Node.js/TypeScript 服务端框架进行了全面的改进，主要涵盖类型安全性、错误处理、性能优化、代码结构等多个方面。

## 主要优化点

### 1. TypeScript 类型定义优化

#### 优化前的问题：
- `Context` 接口中的 `body` 和 `responseData` 使用 `unknown` 类型，缺乏类型安全
- Hook 函数类型定义不够精确，存在 `@ts-expect-error` 注释
- 类型重复定义（如 `Http2sRequest` 和 `Http2Request`）

#### 优化后的改进：
```typescript
// 新增具体的类型定义
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

// 优化 Hook 类型定义
export type HookFunction<T, D> = (ctx: Context<T, D>) => Promise<void> | void
export type ErrorHookFunction<T, D> = (ctx: Context<T, D>, err: Error) => Promise<void> | void

// 新增自定义错误类型
export class RuiError extends Error {
  public statusCode: number;
  public code?: string;
}
```

### 2. 错误处理优化

#### 优化前的问题：
- `executeHooks` 方法中的 Promise.all 可能导致部分 hook 失败时影响其他 hook
- 错误处理逻辑不够完善
- 缺乏统一的错误类型

#### 优化后的改进：
```typescript
// 使用 Promise.allSettled 进行错误隔离
private executeHooks = async (name: HookType, ctx: Context<T, D>, err?: Error): Promise<void> => {
  const results = await Promise.allSettled(
    hooks.map(async (fn) => {
      // 错误隔离处理
    })
  )
  
  // 记录失败的 hooks
  const failures = results.filter(result => result.status === 'rejected')
  if (failures.length > 0) {
    console.warn(`${failures.length} hooks failed in ${name}`)
  }
}

// 统一错误处理
private handleError = async (ctx: Context<T, D>, err: Error): Promise<void> => {
  if (err instanceof RuiError) {
    ctx.res.statusCode = err.statusCode
    ctx.responseData = {
      error: err.message,
      code: err.code,
      statusCode: err.statusCode
    }
  } else {
    // 处理未知错误
  }
}
```

### 3. 性能优化

#### 优化前的问题：
- `collectBody` 函数将整个请求体加载到内存中，对大文件不友好
- Context 对象创建方式可以优化
- 路由匹配算法效率有待提升

#### 优化后的改进：

**请求体解析优化：**
```typescript
// 添加请求体大小限制和错误处理
const collectBody = (req: CommonRequest, limit: number = 1024 * 1024): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        const error = new Error('Payload too large') as any
        error.statusCode = 413
        reject(error)
        return
      }
    })
    // 添加 aborted 事件处理
    req.on('aborted', () => {
      reject(new Error('Request aborted'))
    })
  })
}
```

**路由匹配优化：**
```typescript
// 优化路由查找算法，支持静态路由优先匹配
findRoute = (method: HttpMethod, path: string): RouteMatch<T, D> => {
  // 1. 优先匹配静态路由
  // 2. 匹配参数路由
  // 3. 匹配通配符路由
  // 提升匹配效率
}
```

**中间件组合优化：**
```typescript
// 优化中间件组合逻辑，防止重复调用 next()
private compose = (middlewares: Middleware<T, D>[]): ((ctx: Context<T, D>) => Promise<void>) => {
  return async (ctx: Context<T, D>): Promise<void> => {
    let index = -1
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new RuiError('next() called multiple times', 500)
      }
      // 优化的调度逻辑
    }
  }
}
```

### 4. 代码结构优化

#### 优化前的问题：
- 各个 App 类中存在大量重复代码
- 缺乏统一的配置管理机制
- 代码组织不够模块化

#### 优化后的改进：

**引入工厂基类：**
```typescript
// 创建 ServerFactory 基类减少重复代码
abstract class ServerFactory<T, D, S, O> extends App<T, D> {
  protected abstract createServer(): S
  
  listen(...args: any[]): S {
    const server = this.createServer()
    // 统一的服务器启动逻辑
  }
  
  // 统一的服务器管理方法
  close(server: S): Promise<void>
  getServerInfo(server: S): ServerInfo
}
```

**配置管理优化：**
```typescript
// 新增全局配置接口
export interface GlobalConfig {
  bodyLimit?: number;
  timeout?: number;
  encoding?: BufferEncoding;
  trustProxy?: boolean;
}

// 在 App 类中添加配置方法
setConfig = (config: Partial<GlobalConfig>): this => {
  this.config = { ...this.config, ...config }
  return this
}
```

### 5. 功能增强

#### 新增功能：

**Context 增强：**
```typescript
// 新增便利方法
json(data: any) // JSON 响应
text(data: string) // 文本响应
html(data: string) // HTML 响应
redirect(url: string, statusCode?: number) // 重定向

// 新增属性
get ip(): string // 客户端 IP
get userAgent(): string // 用户代理
get isAjax(): boolean // 是否 AJAX 请求
get acceptsJson(): boolean // 是否接受 JSON
```

**路由增强：**
```typescript
// 新增路由组功能
router.group('/api/v1', (router) => {
  router.get('/users', handler)
  router.post('/users', handler)
})

// 新增路由信息获取
getRoutes(): Array<{ method: string; path: string }>
```

**响应处理增强：**
```typescript
// 新增 CORS 支持
ReplyResolver.setCorsHeaders(ctx, options)

// 新增缓存控制
ReplyResolver.setCacheHeaders(ctx, options)

// 智能内容类型推断
private static inferContentType(data: ResponseData): string | undefined
```

**协议特定功能：**
```typescript
// HTTP/2 服务器推送
serverPush(resources: Array<{ path: string; headers?: Record<string, string> }>)

// HTTPS 安全头部
securityHeaders(options)

// HTTP/2 安全增强
enhancedSecurity(options)
```

### 6. 开发体验优化

#### 改进点：

**更好的错误信息：**
- 统一的错误类型 `RuiError`
- 详细的错误码和状态码
- 更清晰的错误堆栈信息

**类型安全：**
- 完整的 TypeScript 类型定义
- 减少 `any` 和 `unknown` 的使用
- 更好的 IDE 智能提示

**调试支持：**
- 性能监控中间件
- 详细的日志输出
- 路由信息查看功能

## 使用示例

```typescript
import HttpApp from './src/http/index.js'

const app = new HttpApp()

// 配置
app.setConfig({
  bodyLimit: 2 * 1024 * 1024,
  timeout: 60000
})

// 中间件
app.addMiddleware(async (ctx, next) => {
  console.log(`${ctx.req.method} ${ctx.pathname}`)
  await next()
})

// 路由
app.router.get('/', (ctx) => {
  ctx.json({ message: '欢迎使用优化后的 Rui 框架!' })
})

// Hook
app.addHook('onError', (ctx, err) => {
  console.error('错误:', err.message)
})

// 启动
app.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000')
})
```

## 性能提升

1. **内存使用优化**：改进请求体解析，避免大文件内存溢出
2. **路由匹配效率**：优化路由树结构，静态路由优先匹配
3. **错误处理性能**：使用 Promise.allSettled 避免单点失败
4. **中间件执行**：优化组合逻辑，减少不必要的函数调用

## 安全性提升

1. **输入验证**：增强请求体解析的安全性检查
2. **错误信息**：避免敏感信息泄露
3. **安全头部**：自动设置安全相关的 HTTP 头部
4. **TLS 验证**：HTTP/2s 中的 TLS 配置验证

## 向后兼容性

所有优化都保持了向后兼容性，现有代码无需修改即可使用新功能。同时提供了 `addMiddlewares` 的别名方法以保持兼容。

## 建议的下一步优化

1. **静态文件服务**：完善静态文件中间件实现
2. **缓存机制**：添加内置缓存支持
3. **集群支持**：添加多进程/集群模式
4. **监控指标**：添加内置的性能监控和指标收集
5. **插件生态**：建立插件开发规范和生态系统