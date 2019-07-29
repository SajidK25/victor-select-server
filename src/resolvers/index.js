const { Query } = require('./Query')
const { Mutation } = require('./Mutation')
const { User } = require('./User')

const resolvers = {
  Mutation,
  Query,
  User
}

module.exports = { resolvers }