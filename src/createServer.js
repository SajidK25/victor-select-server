const { ApolloServer, makeExecutableSchema } = require('apollo-server-express')
const express = require('express')
const cookieParser = require('cookie-parser')
const { verify } = require('jsonwebtoken')
const { createTokens } = require('./auth')
const { importSchema } = require('graphql-import')
const { resolvers } = require('./resolvers')
const { directiveResolvers } = require('./directives')
const { db } = require('./db')

const schema = makeExecutableSchema({
  typeDefs: importSchema('./src/schema.graphql'),
  resolvers,
  directiveResolvers
})

const startServer = async () => {
  const server = new ApolloServer({
    // These will be defined for both new or existing servers
    schema,
    context: ({ req, res }) => ({ req, res, db })
  })

  const app = express()

  app.use(cookieParser())

  app.use(async (req, res, next) => {
    const refreshToken = req.cookies['refresh-token']
    const accessToken = req.cookies['access-token']
    console.log('Tokens', req.cookies)
    if (!refreshToken && !accessToken) {
      return next()
    }

    try {
      const data = verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
      console.log('Data:', data)
      req.userId = data.userId
      return next()
    } catch {}

    if (!refreshToken) {
      return next()
    }

    let data

    try {
      data = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    } catch {
      console.log('In Catch from verifying')
      return next()
    }

    console.log('DATA', data)
    const user = await db.query.user({ where: { id: data.userId } })
    // token has been invalidated
    if (!user || user.count !== data.count) {
      return next()
    }

    const tokens = createTokens(user)

    res.cookie('refresh-token', tokens.refreshToken)
    res.cookie('access-token', tokens.accessToken)
    req.userId = user.id

    next()
  })

  const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true
  }

  server.applyMiddleware({ app, cors: corsOptions }) // app is from an existing express app

  app.listen({ port: 4444 }, () =>
    console.log(`🚀 Server ready at http://localhost:4444${server.graphqlPath}`)
  )
}

module.exports = startServer
