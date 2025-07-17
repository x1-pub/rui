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

## Installation

```shell
npm install @x1.pub/rui
```

## Simple Example

```typescript
import { HttpApp, HttpsApp, Http2App } from '@x1.pub/rui'

const http = new HttpApp({ /** ServerOptions  */ })
const https = new HttpsApp({ /** ServerOptions  */ })
const http2 = new Http2App({ /** SecureServerOptions */ })

http.use(ctx => {
  ctx.body = 'Hello World';
});

http.listen(8080, () => {
  console.log('The service is running at http://localhost:8080')
})

https.listen(8081, () => {
  console.log('The service is running at http://localhost:8081')
})

http2.listen(8082, () => {
  console.log('The service is running at http://localhost:8082')
})
```

## License

[MIT](https://github.com/x1-pub/rui/raw/main/LICENSE)

## Contact Us

[x1.pub](https://x1.pub/about)
