const createServerStream = require('./server')
const endOfStream = require('end-of-stream')

module.exports = createClientHandler


const connectionStreams = {}

function createClientHandler ({ onNewConnection }) {
  return handleClientConnection

  function handleClientConnection (req, res) {
    const { init } = req.query
    const { connectionId } = req.params
    let connectionStream = connectionStreams[connectionId]
    if (init) {
      // connectionId already in use
      if (connectionStream) {
        res.status(409).send(`connectionId "${connectionId}" already in use`)
        return
      }
      connectionStream = createConnection(connectionId, req)
    } else {
      // connectionId doesnt exist
      if (!connectionStream) {
        res.status(400).send(`connectionId "${connectionId}" not active`)
        return
      }
    }
    // process data flow
    connectionStream.onRequest(req, res)
  }

  function createConnection (connectionId, req) {
    const connectionStream = createServerStream()
    connectionStreams[connectionId] = connectionStream
    // cleanup on end
    endOfStream(connectionStream, (err) => {
      delete connectionStreams[connectionId]
    })
    // report new connection
    onNewConnection({ connectionId, connectionStream, req })
    return connectionStream
  }
}
