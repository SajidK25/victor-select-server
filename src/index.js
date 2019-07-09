require('dotenv').config()
const { checkJwt } = require('./middleware/jwt')
const { getUser } = require('./middleware/getUser')
const createServer = require('./createServer')
const db = require('./db')

const server = createServer()

server.express.post(
  server.options.endpoint,
  checkJwt,
  (err, req, res, next) => {
    if (err) return res.status(401).send(err.message)
    next()
  }
)

server.express.post(server.options.endpoint, (req, res, next) =>
  getUser(req, res, next, db)
)

console.log('Front End', process.env.FRONTEND_URL)
// Start-it now
server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  },
  deets => {
    console.log(`Server is now running on port http:/localhost:${deets.port}`)
  }
)
