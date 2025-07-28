import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import { Http2Server, Http2SecureServer } from 'node:http2'
import App from './index.js'
import type { CommonRequest, CommonResponse, AppOptions, GlobalConfig } from '../type'

abstract class ServerFactory<
  T extends CommonRequest,
  D extends CommonResponse,
  S extends HttpServer | HttpsServer | Http2Server | Http2SecureServer,
  O extends AppOptions & Partial<GlobalConfig>
> extends App<T, D> {
  protected options: O

  constructor (options?: O) {
    super(options)
    this.options = options || ({} as O)
  }

  protected abstract createServer(): S

  listen (...args: any[]): S {
    const server = this.createServer()

    server.listen(...args)

    server.on('listening', () => {
      this.executePlugins().catch(error => {
        console.error('插件执行失败:', error)
      })
    })

    server.on('error', (error) => {
      console.error('服务器错误:', error)
    })

    return server
  }

  close (server: S): Promise<void> {
    return new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  getServerInfo (server: S): { port?: number; address?: string; family?: string } {
    const address = server.address()

    if (!address) {
      return {}
    }

    if (typeof address === 'string') {
      return { address }
    }

    return {
      port: address.port,
      address: address.address,
      family: address.family
    }
  }
}

export default ServerFactory
