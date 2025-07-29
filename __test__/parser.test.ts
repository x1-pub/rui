import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { EventEmitter } from 'events'
import parser from '../src/parser/index.js'
import type { CommonRequest, CommonResponse, Context } from '../src/type'

// 模拟请求对象
class MockRequest extends EventEmitter implements CommonRequest {
  method = 'POST'
  url = '/test?param1=value1&param2=value2'
  headers: Record<string, string | string[]> = {}
  socket = { remoteAddress: '127.0.0.1' }

  constructor(options: Partial<MockRequest> = {}) {
    super()
    Object.assign(this, options)
  }

  // 模拟数据流
  simulateData(data: string | Buffer, chunks: number = 1) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
    const chunkSize = Math.ceil(buffer.length / chunks)
    
    setTimeout(() => {
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize)
        this.emit('data', chunk)
      }
      this.emit('end')
    }, 0)
  }

  simulateError(error: Error) {
    setTimeout(() => {
      this.emit('error', error)
    }, 0)
  }

  simulateAbort() {
    setTimeout(() => {
      this.emit('aborted')
    }, 0)
  }
}

// 模拟上下文
const createMockContext = (req: MockRequest): Context<any, any> => ({
  req,
  res: {} as any,
  protocol: 'http',
  pathname: '/',
  query: {},
  host: 'localhost',
  params: {},
  body: null,
  _responseData: null,
  send: jest.fn(),
  code: jest.fn(),
  setHeader: jest.fn(),
  setHeaders: jest.fn(),
  setCookie: jest.fn(),
  getCookie: jest.fn(),
  getCookies: jest.fn(),
  deleteCookie: jest.fn(),
  clearCookie: jest.fn()
})

describe('解析器测试', () => {
  describe('URL 解析', () => {
    test('应该正确解析简单路径', async () => {
      const req = new MockRequest({ url: '/users' })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)

      expect(result.pathname).toBe('/users')
      expect(result.query).toEqual({})
    })

    test('应该正确解析查询参数', async () => {
      const req = new MockRequest({ url: '/search?q=test&page=1&tags=js&tags=node' })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)

      expect(result.pathname).toBe('/search')
      expect(result.query).toEqual({
        q: 'test',
        page: '1',
        tags: ['js', 'node']
      })
    })

    test('应该正确处理编码的查询参数', async () => {
      const req = new MockRequest({ url: '/search?q=hello%20world&name=%E4%B8%AD%E6%96%87' })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)

      expect(result.query).toEqual({
        q: 'hello world',
        name: '中文'
      })
    })

    test('应该正确处理根路径', async () => {
      const req = new MockRequest({ url: '/' })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)

      expect(result.pathname).toBe('/')
      expect(result.query).toEqual({})
    })

    test('应该正确处理空 URL', async () => {
      const req = new MockRequest({ url: '' })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)

      expect(result.pathname).toBe('/')
      expect(result.query).toEqual({})
    })

    test('应该处理无效 URL', async () => {
      const req = new MockRequest({ url: 'invalid-url' })
      const ctx = createMockContext(req)
      req.simulateData('')

      await expect(parser(ctx)).rejects.toThrow('Invalid URL')
    })
  })

  describe('JSON 解析', () => {
    test('应该正确解析 JSON 数据', async () => {
      const jsonData = { name: '测试', age: 25 }
      const req = new MockRequest({
        headers: { 'content-type': 'application/json' }
      })
      const ctx = createMockContext(req)
      req.simulateData(JSON.stringify(jsonData))

      const result = await parser(ctx)

      expect(result.body).toEqual(jsonData)
    })

    test('应该处理空 JSON', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/json' }
      })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)

      expect(result.body).toEqual({})
    })

    test('应该处理无效 JSON', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/json' }
      })
      const ctx = createMockContext(req)
      req.simulateData('invalid json')

      await expect(parser(ctx)).rejects.toThrow('Invalid JSON payload')
    })

    test('应该处理非对象 JSON', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/json' }
      })
      const ctx = createMockContext(req)
      req.simulateData('"just a string"')

      await expect(parser(ctx)).rejects.toThrow('JSON must be an object')
    })

    test('应该支持不同的 JSON Content-Type', async () => {
      const jsonTypes = [
        'application/json',
        'application/json-patch+json',
        'application/vnd.api+json',
        'application/csp-report'
      ]

      for (const contentType of jsonTypes) {
        const req = new MockRequest({
          headers: { 'content-type': contentType }
        })
        const ctx = createMockContext(req)
        req.simulateData('{"test": true}')

        const result = await parser(ctx)
        expect(result.body).toEqual({ test: true })
      }
    })
  })

  describe('表单数据解析', () => {
    test('应该正确解析表单数据', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      const ctx = createMockContext(req)
      req.simulateData('name=test&age=25&tags=js&tags=node')

      const result = await parser(ctx)

      expect(result.body).toEqual({
        name: 'test',
        age: '25',
        tags: ['js', 'node']
      })
    })

    test('应该处理空表单数据', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)

      expect(result.body).toEqual({})
    })

    test('应该处理编码的表单数据', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      const ctx = createMockContext(req)
      req.simulateData('name=hello%20world&message=%E4%B8%AD%E6%96%87')

      const result = await parser(ctx)

      expect(result.body).toEqual({
        name: 'hello world',
        message: '中文'
      })
    })

    test('应该处理无效表单数据', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      const ctx = createMockContext(req)
      req.simulateData('invalid%form%data%')

      await expect(parser(ctx)).rejects.toThrow('Invalid form data')
    })
  })

  describe('文本解析', () => {
    test('应该正确解析文本数据', async () => {
      const textData = '这是一段测试文本'
      const req = new MockRequest({
        headers: { 'content-type': 'text/plain' }
      })
      const ctx = createMockContext(req)
      req.simulateData(textData)

      const result = await parser(ctx)

      expect(result.body).toBe(textData)
    })

    test('应该支持不同的文本类型', async () => {
      const textTypes = ['text/plain', 'text/html', 'text/css', 'text/javascript']
      const testText = 'test content'

      for (const contentType of textTypes) {
        const req = new MockRequest({
          headers: { 'content-type': contentType }
        })
        const ctx = createMockContext(req)
        req.simulateData(testText)

        const result = await parser(ctx)
        expect(result.body).toBe(testText)
      }
    })

    test('应该处理不同编码', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'text/plain' }
      })
      const ctx = createMockContext(req)
      const config = { bodyLimit: 1024 * 1024, encoding: 'utf8' as BufferEncoding }
      req.simulateData('测试中文内容')

      const result = await parser(ctx, config)

      expect(result.body).toBe('测试中文内容')
    })
  })

  describe('多部分数据解析', () => {
    test('应该正确解析多部分数据', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'multipart/form-data; boundary=----test' }
      })
      const ctx = createMockContext(req)
      
      // 模拟多部分数据
      const multipartData = [
        '------test',
        'Content-Disposition: form-data; name="field1"',
        '',
        'value1',
        '------test',
        'Content-Disposition: form-data; name="field2"',
        '',
        'value2',
        '------test--'
      ].join('\r\n')

      req.simulateData(multipartData)

      const result = await parser(ctx)

      expect(result.body).toHaveProperty('fields')
      expect(result.body).toHaveProperty('files')
    })

    test('应该处理无效多部分数据', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'multipart/form-data' }
      })
      const ctx = createMockContext(req)
      req.simulateData('invalid multipart data')

      await expect(parser(ctx)).rejects.toThrow('Invalid multipart data')
    })
  })

  describe('请求体大小限制', () => {
    test('应该拒绝超过限制的请求体', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'text/plain' }
      })
      const ctx = createMockContext(req)
      const config = { bodyLimit: 10, encoding: 'utf-8' as BufferEncoding }
      
      req.simulateData('这是一个超过限制的长文本内容')

      await expect(parser(ctx, config)).rejects.toThrow('Payload too large')
    })

    test('应该接受在限制内的请求体', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'text/plain' }
      })
      const ctx = createMockContext(req)
      const config = { bodyLimit: 100, encoding: 'utf-8' as BufferEncoding }
      
      req.simulateData('短文本')

      const result = await parser(ctx, config)
      expect(result.body).toBe('短文本')
    })
  })

  describe('错误处理', () => {
    test('应该处理请求错误', async () => {
      const req = new MockRequest()
      const ctx = createMockContext(req)
      
      req.simulateError(new Error('网络错误'))

      await expect(parser(ctx)).rejects.toThrow('网络错误')
    })

    test('应该处理请求中断', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'text/plain' }
      })
      const ctx = createMockContext(req)
      
      req.simulateAbort()

      await expect(parser(ctx)).rejects.toThrow('Request aborted')
    })

    test('应该处理分块数据', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/json' }
      })
      const ctx = createMockContext(req)
      
      // 模拟分块传输
      req.simulateData('{"name": "test", "data": "large content"}', 5)

      const result = await parser(ctx)
      expect(result.body).toEqual({ name: 'test', data: 'large content' })
    })
  })

  describe('Content-Type 处理', () => {
    test('应该正确处理带参数的 Content-Type', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/json; charset=utf-8' }
      })
      const ctx = createMockContext(req)
      req.simulateData('{"test": true}')

      const result = await parser(ctx)
      expect(result.body).toEqual({ test: true })
    })

    test('应该处理大小写不敏感的 Content-Type', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'APPLICATION/JSON' }
      })
      const ctx = createMockContext(req)
      req.simulateData('{"test": true}')

      const result = await parser(ctx)
      expect(result.body).toEqual({ test: true })
    })

    test('应该处理未知 Content-Type', async () => {
      const req = new MockRequest({
        headers: { 
          'content-type': 'application/unknown',
          'content-length': '10'
        }
      })
      const ctx = createMockContext(req)
      req.simulateData('binary data')

      const result = await parser(ctx)
      expect(Buffer.isBuffer(result.body)).toBe(true)
    })

    test('应该处理没有 Content-Type 的请求', async () => {
      const req = new MockRequest()
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)
      expect(result.body).toBeNull()
    })

    test('应该处理有内容长度但无 Content-Type 的请求', async () => {
      const req = new MockRequest({
        headers: { 'content-length': '10' }
      })
      const ctx = createMockContext(req)
      req.simulateData('some data')

      const result = await parser(ctx)
      expect(Buffer.isBuffer(result.body)).toBe(true)
    })
  })

  describe('性能测试', () => {
    test('应该高效处理大量小请求', async () => {
      const requests = []
      const startTime = Date.now()

      for (let i = 0; i < 100; i++) {
        const req = new MockRequest({
          url: `/test${i}?param=${i}`,
          headers: { 'content-type': 'application/json' }
        })
        const ctx = createMockContext(req)
        req.simulateData(`{"id": ${i}}`)
        
        requests.push(parser(ctx))
      }

      await Promise.all(requests)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // 应该在1秒内完成
    })

    test('应该正确处理并发请求', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => {
        const req = new MockRequest({
          url: `/concurrent${i}`,
          headers: { 'content-type': 'application/json' }
        })
        const ctx = createMockContext(req)
        req.simulateData(`{"index": ${i}}`)
        
        return parser(ctx)
      })

      const results = await Promise.all(concurrentRequests)
      
      results.forEach((result, index) => {
        expect(result.pathname).toBe(`/concurrent${index}`)
        expect(result.body).toEqual({ index })
      })
    })
  })

  describe('边界情况', () => {
    test('应该处理空请求体', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/json' }
      })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)
      expect(result.body).toEqual({})
    })

    test('应该处理只有空格的请求体', async () => {
      const req = new MockRequest({
        headers: { 'content-type': 'application/json' }
      })
      const ctx = createMockContext(req)
      req.simulateData('   ')

      const result = await parser(ctx)
      expect(result.body).toEqual({})
    })

    test('应该处理非常长的 URL', async () => {
      const longPath = '/test/' + 'a'.repeat(1000)
      const req = new MockRequest({ url: longPath })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)
      expect(result.pathname).toBe(longPath)
    })

    test('应该处理特殊字符的路径', async () => {
      const specialPath = '/测试/路径/with-special-chars-!@#$%'
      const req = new MockRequest({ url: encodeURI(specialPath) })
      const ctx = createMockContext(req)
      req.simulateData('')

      const result = await parser(ctx)
      expect(result.pathname).toBe(specialPath)
    })
  })
})