import HttpApp from '../src/http/index.js'
import HttpsApp from '../src/https/index.js'
import Http2App from '../src/http2/index.js'
import Http2sApp from '../src/http2s/index.js'
import { RuiError } from '../src/type.js'

// HTTP 服务器示例
const httpApp = new HttpApp()

// 添加全局中间件
httpApp.addMiddleware(async (ctx, next) => {
  console.log(`${ctx.req.method} ${ctx.pathname}`)
  await next()
})

// 错误处理中间件
httpApp.addMiddleware(async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    if (error instanceof RuiError) {
      ctx.code(error.statusCode).json({
        error: error.message,
        code: error.code
      })
    } else {
      ctx.code(500).json({
        error: '服务器内部错误'
      })
    }
  }
})

// 添加路由
httpApp.router.get('/', (ctx) => {
  ctx.json({ message: '欢迎使用 Rui 框架!' })
})

httpApp.router.get('/users/:id', (ctx) => {
  const { id } = ctx.params
  ctx.json({ userId: id, name: `用户${id}` })
})

httpApp.router.post('/users', async (ctx) => {
  const userData = ctx.body as any
  // 模拟创建用户
  ctx.code(201).json({
    id: Date.now(),
    ...userData,
    createdAt: new Date().toISOString()
  })
})

// 添加 Hook
httpApp.addHook('onRequest', (ctx) => {
  console.log('请求开始处理')
})

httpApp.addHook('onResponse', (ctx) => {
  console.log('请求处理完成')
})

httpApp.addHook('onError', (ctx, err) => {
  console.error('请求处理出错:', err.message)
})

// 启动 HTTP 服务器
const httpServer = httpApp.listen(3000, () => {
  console.log('HTTP 服务器运行在 http://localhost:3000')
})

// HTTPS 服务器示例
const httpsApp = new HttpsApp({
  key: '你的私钥',
  cert: '你的证书'
})

// 添加安全中间件
httpsApp.addMiddleware(httpsApp.forceHttps())
httpsApp.addMiddleware(httpsApp.securityHeaders())

httpsApp.router.get('/', (ctx) => {
  ctx.json({ message: '安全的 HTTPS 服务!' })
})

// HTTP/2 服务器示例
const http2App = new Http2App()

// 添加服务器推送
http2App.addMiddleware(http2App.serverPush([
  { path: '/static/app.css', headers: { 'content-type': 'text/css' } },
  { path: '/static/app.js', headers: { 'content-type': 'application/javascript' } }
]))

http2App.router.get('/', (ctx) => {
  ctx.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>HTTP/2 示例</title>
      <link rel="stylesheet" href="/static/app.css">
    </head>
    <body>
      <h1>HTTP/2 服务器</h1>
      <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// HTTP/2 安全服务器示例
const http2sApp = new Http2sApp({
  key: '你的私钥',
  cert: '你的证书'
})

// 添加增强安全中间件
http2sApp.addMiddleware(http2sApp.enhancedSecurity())
http2sApp.addMiddleware(http2sApp.tlsValidation())
http2sApp.addMiddleware(http2sApp.performanceMonitor())

http2sApp.router.get('/', (ctx) => {
  ctx.json({ 
    message: '安全的 HTTP/2 服务!',
    protocol: ctx.protocol,
    ip: ctx.ip,
    userAgent: ctx.userAgent
  })
})

// 路由组示例
httpApp.router.group('/api/v1', (router) => {
  router.get('/health', (ctx) => {
    ctx.json({ status: 'ok', timestamp: Date.now() })
  })

  router.get('/version', (ctx) => {
    ctx.json({ version: '1.0.0' })
  })
})

// 插件示例
const loggerPlugin = async (app: HttpApp, options: any) => {
  console.log('日志插件已加载', options)
  
  app.addHook('onRequest', (ctx) => {
    console.log(`[${new Date().toISOString()}] ${ctx.req.method} ${ctx.pathname}`)
  })
}

httpApp.addPlugin(loggerPlugin, { level: 'info' })

// 配置示例
httpApp.setConfig({
  bodyLimit: 2 * 1024 * 1024, // 2MB
  timeout: 60000, // 60秒
  encoding: 'utf-8'
})

export { httpApp, httpsApp, http2App, http2sApp }