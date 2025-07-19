import 'ts-node/register';
import App, { HttpApp } from './src/index.js'

const app = new App()

app.use((ctx) => {
  ctx.body = '213'
})

app.listen(7001, () => {
  console.log('123123')
})