const test = require('tape')
const http = require('http')
const concat = require('concat-stream')
const pify = require('pify')
const endOfStream = require('end-of-stream')
const asyncEndOfStream = pify(endOfStream)

const createHttpClientStream = require('../src/client')

const port = 9000


asyncTest('client - basic test', async (t) => {
  const server = await setupTestServer(async (request, response) => {
    request.on('data', (rawRequestBody) => {
      const number = parseInt(rawRequestBody.toString(), 10)
      const result = number * 2
      const rawResBody = result.toString()
      response.write(rawResBody)
    })
    await asyncEndOfStream(request)
    response.end()
  })
  const clientStream = createHttpClientStream({
    uri: `http://localhost:${port}`,
  })

  // single round trip
  clientStream.write('24')
  const result1 = await asyncOnce(clientStream, 'data')
  t.equals(result1.toString(), '48', 'response matches expected')

  // another write
  clientStream.write('34')
  const result2 = await asyncOnce(clientStream, 'data')
  t.equals(result2.toString(), '68', 'response matches expected')

  // yet another write
  clientStream.write('13')
  const result3 = await asyncOnce(clientStream, 'data')
  t.equals(result3.toString(), '26', 'response matches expected')

  server.close()
  t.end()
})

test('client - init failure test', (t) => {
  const clientStream = createHttpClientStream({
    uri: `http://localhost:${port}`,
  })

  endOfStream(clientStream, (err) => {
    t.ok(err)
    t.end()
  })

  // single round trip
  clientStream.write('24')
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

function setupTestServer(requestHandler) {
  return new Promise(function(resolve, reject) {
    const server = http.createServer(async (request, response) => {
      await requestHandler(request, response)
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
