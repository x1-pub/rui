import 'ts-node/register';
import HttpApp, { HttpContext, Next } from './src/http/index.js'

const app = new HttpApp()

app.use(async (ctx, next) => {
  if (ctx.req.method === 'POST') {
    let body = '';

    ctx.req.on('data', (chunk) => {
      body += chunk.toString();
    });

    ctx.req.on('end', () => {
      try {
        const jsonBody = JSON.parse(body);
        console.log(jsonBody)
        ctx.res.end(`Received: ${JSON.stringify(jsonBody)}`);
      } catch (error) {
        ctx.res.statusCode = 400;
        ctx.res.end('Invalid JSON');
      }
    });
  } else {
    ctx.res.end('Send a POST ctx.request!');
  }
  ctx.body = '213'
})

app.listen(7001, () => {
  console.log('http://localhost:7001')
})