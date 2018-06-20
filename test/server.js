const test = require('tape')
const http = require('http')
const concat = require('concat-stream')
const pify = require('pify')
const hyperquest = require('hyperquest')
const pump = require('pump')
const pumpAsync = pify(pump)
const from = require('from2')

const createHttpServerStream = require('../src/server')

const port = 9000


asyncTest('basic test', async (t) => {
  const serverStream = createHttpServerStream({})
  // create server with serverStream's onRequest handler
  const server = await setupTestServer(serverStream.onRequest)

  // queue up some writes for the client
  serverStream.write('1')
  serverStream.write('2')
  serverStream.write('3')
  serverStream.end()

  // send data to server and read response
  let serverSentData
  await pumpAsync(
    fromString('haay wuurl'),
    hyperquest.post(`http://localhost:${port}`),
    concat((_serverSentData) => {
      serverSentData = _serverSentData
    })
  )

  // read data from client
  let clientSentData
  await pumpAsync(
    serverStream,
    concat((_clientSentData) => {
      clientSentData = _clientSentData
    })
  )

  t.equal(serverSentData.toString(), '123', 'server sent data matches expected')
  t.equal(clientSentData.toString(), 'haay wuurl', 'client sent data matches expected')

  // // single round trip
  // clientStream.write('24')
  // const result1 = await asyncOnce(clientStream, 'data')
  // t.equals(result1.toString(), '48', 'response matches expected')
  //
  // // two writes are concattenated
  // clientStream.write('12')
  // clientStream.write('34')
  // const result2 = await asyncOnce(clientStream, 'data')
  // t.equals(result2.toString(), '2468', 'response matches expected')
  //
  // // single write again
  // clientStream.write('13')
  // const result3 = await asyncOnce(clientStream, 'data')
  // t.equals(result3.toString(), '26', 'response matches expected')

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
      // const rawRequestBody = await readToEnd(request)
      // const number = parseInt(rawRequestBody.toString(), 10)
      // const result = number * 2
      // const rawResBody = result.toString()
      // response.end(rawResBody)
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


function fromString(string) {
  return from(function(size, next) {
    // if there's no more content
    // left in the string, close the stream.
    if (string.length <= 0) return next(null, null)

    // Pull in a new chunk of text,
    // removing it from the string.
    var chunk = string.slice(0, size)
    string = string.slice(size)

    // Emit "chunk" from the stream.
    next(null, chunk)
  })
}
