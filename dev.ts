import 'ts-node/register';
import Rui from './src/http/index.js'

const rui = new Rui()

rui.addHook('onError', (ctx, err) => {
  // console.log(err)
  ctx.send({ code: 999, message: '213123' })
})

rui.router.get('/', async ctx => {
  // ctx.res.setHeader('content-type', '1313123')
  // ctx.res.statusCode = 999
  // ctx._responseData = [1,2,false]
  // ctx.send('hhhhh').code(200)
  throw new Error('1312')
})

rui.addMiddleware(async (ctx, next) => {
  // console.log(ctx.pathname)
  await next()
})
rui.addMiddleware(async (ctx, next) => {
  // console.log(ctx.ip)
  await next()
})

// rui.addHook('onResponse', (ctx) => {
//   console.log(ctx._responseData)
// })

rui.listen(8888, () => {
  console.log('http://localhost:8888')
})
