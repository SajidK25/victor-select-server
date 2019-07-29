const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const ctxUser = ctx => ctx.request.user

const Query = {
  me(_, __, { req, db }, info) {
    console.log("Me", req.userId)
    if (!req.userId) {
      return null
    }
    console.log("Me", req.user)
    return db.query.user({ where: { id: req.userId } })
  },
  users: forwardTo('db'),
  async userExists(parent, args, ctx, info) {

    console.log('userExists', args.email)
    args.email = args.email.toLowerCase()
    const user = await ctx.db.query.user({
      where: { email: args.email }
    })
    return ( user !== null )
  }
}

module.exports = { Query }
