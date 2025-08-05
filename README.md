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

## Overview

`Rui` is a high-performance Node.js server framework built on TypeScript, supporting `http/https/http2`, and designed for developers who prioritize ultimate efficiency and development experience.

Compared with mainstream frameworks like Koa, Rui has undergone targeted optimizations in its underlying architecture, achieving faster route matching and request processing capabilities, and maintaining stable performance under high-concurrency scenarios.

Adhering to the design concept of `Ready to Use Out of the Box`, the framework comes with a series of essential plugins frequently used in development (such as route management, middleware mechanism, request parsing, etc.), enabling developers to quickly set up a fully functional server application without additional configuration. Meanwhile, Rui also retains `high flexibility`, supporting the extension of functionality through a custom plugin mechanism to meet the personalized needs of different business scenarios.

Whether you're rapidly developing a small project or building a complex enterprise-level application, Rui can provide you with efficient and reliable technical support.

<p align="center">
  <img src="https://github.com/x1-pub/rui/raw/main/docs/architecture.png" alt="Rui's architecture diagram"/>
</p>

## Installation

```shell
npm install @x1.pub/rui
```

## Simple Example

```typescript
import Rui from '@x1.pub/rui' // equals: import Rui from '@x1.pub/rui/http'

// Additionally, you can:
// import Rui from '@x1.pub/rui/http2'
// import Rui from '@x1.pub/rui/http2s'
// import Rui from '@x1.pub/rui/https'

const rui = Rui()

rui.addMiddleware(async (ctx, next) => {
  console.log(`hi, ${ctx.pathname}`)
  await next()
  console.log(`over, ${ctx.pathname}`)
})

rui.router.get('/', async (ctx) => {
  ctx.send('rui!')
})

rui.addPlugin((rui) => {
  rui.router.all('/test', (ctx) => {
    ctx.send('test!')
  })

  rui.router.post('/user/:id', (ctx, next) => {}, (ctx) => {
    ctx.send(ctx.query.id)
  })
}, { prefix: '/api/v1'})

rui.addHook('onError', (ctx, err) => {
  ctx.send(err)
})

rui.listen(8888, () => {
  console.log('Rui HTTP server running at http://localhost:8888')
})
```

## License

[MIT](https://github.com/x1-pub/rui/raw/main/LICENSE)

## Contact Us

[x1.pub](https://x1.pub/about)
