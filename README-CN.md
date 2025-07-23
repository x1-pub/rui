<p align="center">
  <img src="https://github.com/x1-pub/rui/raw/main/docs/logo.jpg" alt="Rui is a TypeScript-based Node.js server-side framework"/>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@x1.pub/rui">
    <img src="https://img.shields.io/badge/npm-%3E%3D10-blue" alt="npm version" >
  </a>
  <a href="https://nodejs.org/en/about/previous-releases">
    <img src="https://img.shields.io/badge/node-%3E%3D18-green" alt="node version">
  </a>
  <a href="https://github.com/x1-pub/rui/raw/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-yellow" alt="license MIT">
  </a>
  <a href="https://github.com/x1-pub/rui/blob/main/README.md">
    <img src="https://img.shields.io/badge/README-EN-yellow" alt="README EN">
  </a>
  <a href="https://github.com/x1-pub/rui/blob/main/README-CN.md">
    <img src="https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-yellow" alt="README 中文">
  </a>
</p>

<h1 align="center">Rui</h1>

## 概述

`Rui` 是一款基于 TypeScript 构建的支持 `http/https/http2` 的高性能 Node.js 服务端框架，专为追求极致效率与开发体验的开发者设计。

相较于主流框架如 Koa，Rui 在底层架构上进行了针对性优化，实现了更快速的路由匹配与请求处理能力，能在高并发场景下保持稳定的性能表现。

框架秉持 `“开箱即用”` 的设计理念，内置了一系列开发中高频使用的必要插件（如路由管理、中间件机制、请求解析等），无需额外配置即可快速搭建起功能完善的服务端应用。同时，Rui 也保留了`高度的灵活性`，支持通过自定义插件机制扩展功能，满足不同业务场景的个性化需求。

无论是快速开发小型项目，还是构建复杂的企业级应用，Rui 都能为你提供高效、可靠的技术支撑。

## 安装

```shell
npm install @x1.pub/rui
```

## 简单示例

```typescript
import Rui from '@x1.pub/rui' // equals: import Rui from '@x1.pub/rui/http'

// Additionally, you can:
// import Rui from '@x1.pub/rui/http2'
// import Rui from '@x1.pub/rui/http2s'
// import Rui from '@x1.pub/rui/https'

const rui = new Rui()

rui.addMiddlewares(async (ctx, next) => {
  console.log(`hi, ${ctx.pathname}`)
  await next()
  console.log(`over, ${ctx.pathname}`)
})

rui.router.get('/', (ctx) => {
  ctx.data = 'rui!'
})

rui.addPlugin((rui) => {
  rui.router.all('/test', (ctx) => {
    ctx.data = 'test!'
  })

  rui.router.post('/user/:id', (ctx, next) => {}, (ctx) => {
    ctx.data = ctx.query.id
  })
}, { prefix: '/api/v1'})

rui.addHook('onError', (ctx, err) => {
  ctx.data = err
})

rui.listen(8888)
```

## 许可

[MIT](https://github.com/x1-pub/rui/raw/main/LICENSE)

## 联系我们

[x1.pub](https://x1.pub/about)