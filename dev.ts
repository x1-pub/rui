import 'ts-node/register';
import HttpApp, { HttpContext, Next } from './src/http/index.js'

const sleep = (num: number) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(123)
  }, num)
})

const app = new HttpApp()

app.use(async (ctx, next) => {
  console.log('use')
  throw new Error('123123')
})

app.addHook('onError', (ctx, err) => {
  console.log(err)
  console.log('onError')
  ctx.body = 'have an error'
})
app.addHook('onRequest', ctx => {
  console.log('onRequest')
  throw new Error('456456')
})

app.listen(8888, () => {
  console.log('http://localhost:8888')
})
