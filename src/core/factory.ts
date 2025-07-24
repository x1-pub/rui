import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import { Http2Server, Http2SecureServer } from 'node:http2'
import App from './index.js'
import type { CommonRequest, CommonResponse, AppOptions } from '../type.js'

/**
 * 服务器工厂基类，减少各个 App 类的重复代码
 */
abstract class ServerFactory<
  T extends CommonRequest,
  D extends CommonResponse,
  S extends HttpServer | HttpsServer | Http2Server | Http2SecureServer,
  O extends AppOptions
> extends App<T, D> {
  protected options: O

  constructor (options?: O) {
    super(options)
    this.options = options || ({} as O)
  }

  /**
   * 创建服务器实例
   */
  protected abstract createServer(): S

  /**
   * 启动服务器监听
   */
  listen (...args: any[]): S {
    const server = this.createServer()

    // 设置服务器监听
    server.listen(...args)

    // 在服务器开始监听后执行插件
    server.on('listening', () => {
      this.executePlugins().catch(error => {
        console.error('插件执行失败:', error)
      })
    })

    // 错误处理
    server.on('error', (error) => {
      console.error('服务器错误:', error)
    })

    return server
  }

  /**
   * 优雅关闭服务器
   */
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

  /**
   * 获取服务器信息
   */
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
