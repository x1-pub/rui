import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import { Http2Server, Http2SecureServer } from 'node:http2'
import App from './index.js'
import type { CommonRequest, CommonResponse, AppOptions } from '../type'

abstract class ServerFactory<
  T extends CommonRequest,
  D extends CommonResponse,
  S extends HttpServer | HttpsServer | Http2Server | Http2SecureServer,
  O extends AppOptions
> extends App<T, D> {
  protected options: O
  private server!: S

  constructor (options?: O) {
    super(options)
    this.options = options || ({} as O)
  }

  protected abstract createServer(): S

  listen (...args: any[]): S {
    this.server = this.createServer()

    this.server.listen(...args)

    this.server.on('listening', () => {
      this.executePlugins()
    })

    this.server.on('error', (error) => {
      console.error('Server Error.')
      console.error(error)
    })

    return this.server
  }

  close (): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  getServerInfo (): { port?: number; address?: string; family?: string } {
    const address = this.server.address()

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
