// This file connects to the remote prisma DB and gives us the ability to query it with javascript
const { Prisma, extractFragmentReplacements } = require('prisma-binding')
const { resolvers } = require('./resolvers')

const db = new Prisma({
  fragmentReplacements: extractFragmentReplacements(resolvers),
  typeDefs: 'src/generated/prisma.graphql',
  endpoint: process.env.PRISMA_ENDPOINT,
  secret: process.env.PRISMA_SECRET,
  debug: false
})

// const db = new Prisma({
//   typeDefs: 'src/generated/prisma.graphql',
//   endpoint: process.env.PRISMA_ENDPOINT,
//   secret: process.env.PRISMA_SECRET,
//   debug: false
// })

module.exports = { db }
