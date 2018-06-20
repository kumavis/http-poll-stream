const duplexify = require('duplexify')
const ThroughStream = require('readable-stream').PassThrough
const pump = require('pump')
const endOfStream = require('end-of-stream')
const hyperquest = require('hyperquest')
const substreamOnActive = require('substream-on-active')
const { createSubstream } = require('substream-on-active')

module.exports = createHttpServerStream

function createHttpServerStream(opts) {
  const inStream = new ThroughStream()
  const outStream = new ThroughStream()
  const primaryStream = duplexify(inStream, outStream)
  const idleDelay = opts.idleDelay || 400
  const uri = opts.uri

  primaryStream.onRequest = onRequest

  function onRequest(request, response) {
    // manually pipe in data so we dont propagate the end event
    request.on('data', (data) => outStream.write(data))
    // read whatever data is ready to go
    const childStream = createSubstream(inStream, { delay: idleDelay })
    childStream.pipe(response)
  }

  // forward inStream end to outStream
  endOfStream(inStream, (err) => {
    outStream.end(err)
  })

  return primaryStream
}
