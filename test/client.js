const test = require('tape')
const http = require('http')
const concat = require('concat-stream')
const pify = require('pify')

const createHttpClientStream = require('../src/client')

const port = 9000


asyncTest('basic test', async (t) => {
  const server = await setupTestServer()
  const clientStream = createHttpClientStream({
    uri: `http://localhost:${port}`,
  })

  // single round trip
  clientStream.write('24')
  const result1 = await asyncOnce(clientStream, 'data')
  t.equals(result1.toString(), '48', 'response matches expected')

  // two writes are concattenated
  clientStream.write('12')
  clientStream.write('34')
  const result2 = await asyncOnce(clientStream, 'data')
  t.equals(result2.toString(), '2468', 'response matches expected')

  // single write again
  clientStream.write('13')
  const result3 = await asyncOnce(clientStream, 'data')
  t.equals(result3.toString(), '26', 'response matches expected')

  server.close()
  t.end()
})


function asyncTest(label, asyncFn) {
  test(label, async (t) => {
    try {
      await asyncFn(t)
    } catch (err) {
      t.ifError(err)
    }
  })
}

function setupTestServer() {
  return new Promise(function(resolve, reject) {
    const server = http.createServer(async (request, response) => {
      const rawRequestBody = await readToEnd(request)
      const number = parseInt(rawRequestBody.toString(), 10)
      const result = number * 2
      const rawResBody = result.toString()
      response.end(rawResBody)
    })
    server.listen(port, (err) => {
      if (err) return reject(err)
      resolve(server)
    })
  })
}


function readToEnd(stream) {
  return new Promise((resolve) => {
    stream.pipe(concat(resolve))
  })
}

async function asyncOnce(eventEmitter, eventName) {
  return await pify(eventEmitter.once, { errorFirst: false }).call(eventEmitter, eventName)
}
