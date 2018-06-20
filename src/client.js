const duplexify = require('duplexify')
const ThroughStream = require('readable-stream').PassThrough
const pump = require('pump')
const hyperquest = require('hyperquest')
const substreamOnActive = require('substream-on-active')


module.exports = createHttpClientStream

function createHttpClientStream(opts) {
  const inStream = new ThroughStream()
  const outStream = new ThroughStream()
  const primaryStream = duplexify(inStream, outStream)
  const idleDelay = opts.idleDelay || 400
  const uri = opts.uri

  // break inStream into small childStreams of activity
  substreamOnActive(inStream, { delay: idleDelay }, async (childStream) => {
    const writeStream = new ThroughStream()
    pump(
      childStream,
      hyperquest.post(uri),
      writeStream,
      (err) => {
        if (err) console.error(err)
      }
    )
    // manually pipe in data so we dont propagate the end event
    writeStream.on('data', (data) => outStream.write(data))
  })

  return primaryStream
}
