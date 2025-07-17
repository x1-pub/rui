const { HttpApp } = require('../dist/index.cjs')
const assert = require('node:assert')

const PORT = 3000;

const app = new HttpApp();

app.use((ctx, next) => {
  console.log(ctx.pathname)
  console.log(ctx.query)
  ctx.body = 'hello'
});

const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

async function runTests() {
  const getRes = await fetch(`http://localhost:${PORT}?a=1#xx`);
  assert.equal(getRes.status, 200);
  assert.equal(await getRes.text(), 'hello');

  // const paramRes = await fetch(`http://localhost:${PORT}/user/42`);
  // assert.equal(await paramRes.text(), 'User ID: 42');

  // const postRes = await fetch(`http://localhost:${PORT}/api/data`, {
  //   method: 'POST',
  //   body: JSON.stringify({ test: true })
  // });
  // assert.equal(await postRes.text(), 'Received: {"test":true}');

  // const notFoundRes = await fetch(`http://localhost:${PORT}/not-found`);
  // assert.equal(notFoundRes.status, 404);

  console.log('All tests passed!');
  // app.close();
  server.close()
}

setTimeout(runTests, 500);