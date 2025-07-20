import 'ts-node/register';
import HttpApp, { HttpContext, Next } from './src/http/index.js'

const app = new HttpApp()

app.use(async (ctx, next) => {
  console.log(ctx.data)
  ctx.body = '123'
})

app.listen(8888, () => {
  console.log('http://localhost:8888')
})