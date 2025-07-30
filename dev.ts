import 'ts-node/register';
import Rui from './src/http/index.js'

const rui = new Rui({
  bodyLimit: 1024
})

rui.addPlugin(() => {
  // throw new Error('123')
})

rui.addHook('onError', (ctx, err) => {
  console.log(err)
  ctx.send({ code: 999, message: 'error' })
})

rui.router.get('/123/:a/:a', async ctx => {
  console.log(ctx.getConfigs())
  ctx.send('hhhhh')
})

rui.router.get('/', async ctx => {
  console.log(ctx.getConfigs())
  ctx.send('hhhhh')
})

rui.router.get('/test/哈哈', async ctx => {
  console.log(ctx.pathname)
  ctx.send('hhhhhxx')
})

rui.addMiddleware(async (ctx, next) => {
  console.log(ctx.ip)
  await next()
})

rui.listen(8888, () => {
  console.log('http://localhost:8888')
  console.log(rui.getServerInfo())
})

