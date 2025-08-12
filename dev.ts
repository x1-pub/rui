import Rui, { Validator, ValidationError } from './src/http/index.js'
import type { ValidationRule } from './src/http/index.js'

const rui = Rui({
  cors: {
    origin: '*'
  }
})

rui.router.get('/', async ctx => {
  ctx.send('hhhhh')
})

rui.listen(8888, () => {
  console.log('http://localhost:8888')
})
