const { GraphQLServer } = require('graphql-yoga')
const { makeExecutableSchema } = require('graphql-tools')
const { importSchema } = require('graphql-import')
const { resolvers } = require('./resolvers')
const { directiveResolvers } = require('./directives')
const db = require('./db')

const schema = makeExecutableSchema({
  typeDefs: importSchema('./src/schema.graphql'),
  resolvers,
  directiveResolvers
})

// Create the GraphQL Yoga Server

function createServer() {
  return new GraphQLServer({
    schema,
    context: req => ({
      ...req,
      db
    })
  })
}

// function createServer() {
//   return new GraphQLServer({
//     typeDefs: 'src/schema.graphql',
//     resolvers: {
//       Mutation,
//       Query,
//     },
//     resolverValidationOptions: {
//       requireResolversForResolveType: false
//     },
//     context: request => ({ ...request, db })
//   })
// }

module.exports = createServer
