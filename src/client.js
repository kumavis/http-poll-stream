const duplexify = require('duplexify')
const ThroughStream = require('readable-stream').PassThrough
const pify = require('pify')
const pumpAsync = pify(require('pump'))
const hyperquest = require('hyperquest')
const { queue: createQueue }= require('async-q')
const { substreamOnActive } = require('substream-on-active')


module.exports = createHttpClientStream

function createHttpClientStream(opts) {
  const inStream = new ThroughStream()
  const outStream = new ThroughStream()
  const primaryStream = duplexify(inStream, outStream)
  const idleDelay = opts.idleDelay || 200
  const uri = opts.uri
  let isInitialized = false

  // create a queue to handle each childStream serially
  const queue = createQueue(processChildStream, 1)

  substreamOnActive(inStream, { delay: idleDelay }, (childStream) => {
    queue.push(childStream)
  })

  // break inStream into small childStreams of activity
  async function processChildStream (childStream) {
    let targetUri = uri
    if (!isInitialized) {
      targetUri += '?init=1'
      isInitialized = true
    }
    const writeStream = hyperquest.post(targetUri)
    // manually pipe in data so we dont propagate the end event
    writeStream.on('data', (data) => outStream.write(data))
    // manually propagate the error event
    writeStream.on('error', (err) => outStream.emit('error', err))

    await pumpAsync(
      childStream,
      writeStream
    )
  }

  return primaryStream
}
