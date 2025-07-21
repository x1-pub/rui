import 'ts-node/register';
import HttpApp, { HttpContext, Next } from './src/http/index.js'

const sleep = (num: number) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(123)
  }, num)
})

const app = new HttpApp()

app.addMiddlewares(async (ctx, next) => {
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

app.addPlugin((rui, options) => {
  // rui.
  console.log(1)
}, {})

app.addPlugin(async(rui, options) => {
  // rui.
  console.log(2)
}, {})

app.addPlugin((rui, options) => {
  // rui.
  console.log(3)
}, {})

// app.


app.listen(8888, () => {
  console.log('http://localhost:8888')
})
