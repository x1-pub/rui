import Rui, { Validator, ValidationError } from './src/http/index.js'
import type { ValidationRule } from './src/http/index.js'

const rui = Rui({
  bodyLimit: 1024
})

const TestSchema: ValidationRule = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      le: 30,
      ge: 1,
    },
    nameCn: {
      type: 'string',
      le: 30,
      ge: 1,
    },
    description: {
      type: 'string',
      le: 200,
    },
  }
}

rui.router.get('/', async ctx => {
  const query = await new Validator(TestSchema).valid(null)
  console.log(query)
  ctx.send('hhhhh')
})

rui.addHook('onError', (ctx, err) => {
  if (err instanceof ValidationError) {
    const firstInfo = err.info[0]
    ctx.json({
      code: 400,
      message: `${firstInfo.field} ${firstInfo.message}`
    })
    return
  }

  ctx.json({
    code: 500,
    message: err.message || 'Internal Server Error'
  })
})

rui.listen(8888, () => {
  console.log('http://localhost:8888')
  console.log(rui.getServerInfo())
})
