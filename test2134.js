// (cd test2134 && cat ../test2134.js > index.js && node index.js)
// npm i axios ws

const WebSocket = require('ws')

const FORTNOX_CLIENT_SECRET = 'xxx'
const FORTNOX_AUTHORIZATION = 'Bearer xxx'

const ws = new WebSocket('wss://ws.fortnox.se/topics-v1')

function wsSend (data) {
  ws.send(JSON.stringify(data))
}

ws.on('open', () => {
  console.log('opened')

  wsSend({
    command: 'add-tenants-v1',
    clientSecret: FORTNOX_CLIENT_SECRET,
    accessTokens: [FORTNOX_AUTHORIZATION]
  })
})

ws.on('error', (err) => {
  console.error('error:', err)
})

ws.on('message', (msg) => {
  console.log('message:', msg.toString())
})

setTimeout(() => {
  ws.close()
}, 5e3)
