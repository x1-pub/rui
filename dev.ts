import 'ts-node/register';
import HttpApp, { HttpContext, Next } from './src/http/index.js'

const sleep = (num: number) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(123)
  }, num)
})

const app = new HttpApp()

app.addHook('onError', (ctx, err) => {
  console.log(err)
  console.log('onError')
  ctx.data = 'have an error'
})

app.addPlugin((rui, options) => {
  rui.router.get('/user', (ctx) => {
    ctx.data = 'get zhangsan'
  })
  rui.router.post('/user', (ctx) => {
    ctx.data = 'post zhangsan'
  })
  rui.router.delete('/user/uu', async (ctx, next) => {
    console.log(1)
    await next()
    console.log(4)
  }, async (ctx, next) => {
    console.log(2)
    await next()
    console.log(3)
  }, (ctx) => {
    ctx.data = 'delete zhangsan'
  })
  rui.router.all('/test', (ctx) => {
    ctx.data = 'all test'
  })
  // rui.all('*', async ctx => {
  //   console.log(333)
  //   ctx.data = 'all *'
  // })
}, {})



app.listen(8888, () => {
  console.log('http://localhost:8888')
})
