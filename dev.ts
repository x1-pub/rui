import 'ts-node/register';
import Rui from './src/http/index.js'

const rui = new Rui()

rui.addHook('onError', (ctx, err) => {
  console.log(err)
  ctx.data = 'have an error'
})

rui.router.get('/', ctx => {
  // ctx.res.setHeader('content-type', '1313123')
  // ctx.res.statusCode = 999
  ctx.data = 'hello'
})

rui.listen(8888, () => {
  console.log('http://localhost:8888')
})
