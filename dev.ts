import 'ts-node/register';
import Rui from './src/http/index.js'

const rui = new Rui()

rui.addHook('onError', (ctx, err) => {
  console.log(err)
  ctx.responseData = 'have an error'
})

rui.router.get('/', ctx => {
  // ctx.res.setHeader('content-type', '1313123')
  // ctx.res.statusCode = 999
  // ctx.responseData = [1,2,false]
  ctx.send('hhhhh').code(999)
})

rui.addHook('onResponse', (ctx) => {
  console.log(ctx.responseData)
})

rui.listen(8888, () => {
  console.log('http://localhost:8888')
})
