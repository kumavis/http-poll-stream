const test = require('tape')
const http = require('http')
const concat = require('concat-stream')
const pify = require('pify')
const pump = require('pump')
const transform = require('parallel-transform')
const createHttpClientStream = require('../src/client')
const createHttpServerStream = require('../src/server')
const timeout = (duration) => new Promise(resolve => setTimeout(resolve, duration))

const port = 9000
const idleDelay = 400

asyncTest('both - basic test', async (t) => {
  const clientStream = createHttpClientStream({
    uri: `http://localhost:${port}`,
    idleDelay,
  })
  const serverStream = createHttpServerStream({ idleDelay })
  // create server with serverStream's onRequest handler
  const server = await setupTestServer(serverStream.onRequest)


  pump(
    serverStream,
    transform(1, double),
    serverStream,
    (err) => console.log('test pipleine ended', err)
  )

  function double(chunk, cb) {
    const number = Number.parseInt(chunk.toString(), 10)
    const result = number * 2
    cb(null, result.toString())
  }

  // single round trip
  const activity1 = asyncOnce(clientStream, 'data')
  clientStream.write('24')
  const result1 = await activity1
  t.equals(result1.toString(), '48', 'response matches expected')
  await timeout(idleDelay * 1.5)

  // write again
  const activity2 = asyncOnce(clientStream, 'data')
  clientStream.write('34')
  const result2 = await activity2
  t.equals(result2.toString(), '68', 'response matches expected')
  await timeout(idleDelay * 1.5)

  // single write again
  const activity3 = asyncOnce(clientStream, 'data')
  clientStream.write('13')
  const result3 = await activity3
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
