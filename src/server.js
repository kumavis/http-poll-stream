const duplexify = require('duplexify')
const ThroughStream = require('readable-stream').PassThrough
const endOfStream = require('end-of-stream')
const { createSubstreamer } = require('substream-on-active')

module.exports = createHttpServerStream

function createHttpServerStream(opts) {
  opts = opts || {}
  const inStream = new ThroughStream()
  const outStream = new ThroughStream()
  const primaryStream = duplexify(inStream, outStream)
  const idleDelay = opts.idleDelay || 400
  const closeResponseDelay = opts.closeResponseDelay || 20

  const getNextChildStream = createSubstreamer(inStream)
  let nextChildStream = getNextChildStream()

  primaryStream.onRequest = onRequest

  function onRequest(request, response) {
    // grab constant reference to nextChildStream
    const currentChildStream = nextChildStream
    // when request is done, break off the current childStream
    endOfStream(request, (err) => {
      if (err) return console.error(err)
      // wait a short time to allow a response to be prepared
      setTimeout(() => {
        // this triggers the end of currentChildStream
        nextChildStream = getNextChildStream()
      }, closeResponseDelay)
    })
    // manually pipe in data so we dont propagate the end event
    request.on('data', (data) => outStream.write(data))
    // flow whatever data is ready as the response
    currentChildStream.pipe(response)
  }

  // forward inStream end to outStream
  endOfStream(inStream, (err) => outStream.end(err))

  return primaryStream
}
