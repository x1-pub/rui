import 'ts-node/register';
import Rui from './src/http/index.js'

const rui = new Rui()

rui.addPlugin(() => {
  // throw new Error('123')
})
rui.addHook('onError', (ctx, err) => {
  ctx.send({ code: 999, message: 'error' })
})

rui.router.get('/', async ctx => {
  ctx.send('hhhhh')
})

rui.addMiddleware(async (ctx, next) => {
  console.log(ctx.ip)
  await next()
})

rui.listen(8888, () => {
  console.log('http://localhost:8888')
  console.log(rui.getServerInfo())
})

