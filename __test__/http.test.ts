import HttpApp from '../src/http/index.js'
import assert from 'node:assert'
import { describe, it } from 'node:test'

const app = new HttpApp();

app.use((ctx) => {
  ctx.body = 'hello'
})

const server = app.listen(7001, async () => {
  runTest()
})

function runTest() {
  describe('app', () => {
    it('should have a response', async () => {
      const getRes = await fetch(`http://localhost:7000`);
      assert.equal(getRes.status, 200);
      assert.equal(await getRes.text(), 'hello');
    })
  })

}
