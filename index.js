const net = require('net')
const debug = require('debug').debug('AA:proxy')

function parseAddress(address, defaultHost) {
  if (!address)
    return undefined

  if (address.indexOf(':') < 0)
    address = defaultHost + ':' + address

  const match = /^(.*):(\d+)$/.exec(address)
  if (!match)
    return undefined

  return {
    host: match[1],
    port: match[2],
    full: `${match[1]}:${match[2]}`
  }
}

function parseArgs() {
  const from = parseAddress(process.argv[2], '0.0.0.0')
  const to = parseAddress(process.argv[3], 'localhost')

  if (!from || !to) {
    console.log('Usage: <from> <to>')
    process.exit(1)
  }

  return {
    from,
    to
  }
}

const { from, to } = parseArgs()
var connectionCounter = 0

function serveNewConnection(source) {
  const id = ++connectionCounter
  debug(`#${id}, new from ${source.remoteAddress}:${source.remotePort}`)

  source.on('end', () => {
    debug(`#${id}, closed, bytes sent/received ${source.bytesRead}/${source.bytesWritten}`)
  })

  const dest = net.createConnection(to)

  dest.on('error', (err) => {
    debug(`#${id}, error: ${err}`)
    source.end()
  })

  source.pipe(dest)
  dest.pipe(source)
}

function startListener() {
  const listener = net.createServer(serveNewConnection)
  listener.listen(from.port, from.host, () => {
    debug(`Forwarding ${from.full} -> ${to.full}`)
  })
}

startListener()

