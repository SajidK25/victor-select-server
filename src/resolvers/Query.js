const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const ctxUser = ctx => ctx.request.user

const Query = {
  me(parent, args, ctx, info) {
    return ctx.db.query.user({ where: { id: ctxUser(ctx).id } })
  },
  users: forwardTo('db'),
  async userExists(parent, args, ctx, info) {
    console.log('userExists', args.email)
    args.email = args.email.toLowerCase()
    const user = await ctx.db.query.user({
      where: { email: args.email }
    })
    return { message: user !== null }
  }
}

module.exports = { Query }
