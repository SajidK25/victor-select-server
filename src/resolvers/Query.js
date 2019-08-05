const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const ctxUser = ctx => ctx.request.user

const Query = {
  me(_, __, { req, db }, info) {
    console.log('Me', req.userId)
    if (!req.userId) {
      return null
    }
    console.log('Me', req.user)
    return db.query.user({ where: { id: req.userId } })
  },
  users: forwardTo('db'),
  async userExists(parent, args, ctx, info) {
    console.log('CTX -----', ctx.db.schema._typeMap.Role)
    args.email = args.email.toLowerCase()
    const user = await ctx.db.query.users({
      where: { email: args.email, role_not: 'VISITOR' }
    })
    console.log('User=', user)
    return user.length > 0
  }
}

module.exports = { Query }
