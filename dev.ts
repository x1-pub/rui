import Rui, { validator } from './src/http/index.js'
import type { ValidationRule } from './src/http/index.js'

const rui = new Rui({
  bodyLimit: 1024
})

const TestSchema: ValidationRule = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      enum: ['1', '2', '3']
    }
  }
}

rui.router.get('/', async ctx => {
  const { data, valid, errors } = await validator(TestSchema).test(ctx.query)
  console.log(data)
  console.log(valid)
  console.log(errors)
  ctx.send('hhhhh')
})

rui.listen(8888, () => {
  console.log('http://localhost:8888')
  console.log(rui.getServerInfo())
})
