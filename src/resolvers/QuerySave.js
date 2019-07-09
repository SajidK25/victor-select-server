const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const CheckLogin = ctx => {
  if (!ctx.request.userId) {
    throw new Error('You must be logged in!')
  }
}

const ctxUser = ctx => ctx.request.user

const Query = {
  items: forwardTo('db'),
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  me(parent, args, ctx, info) {
    // check if there is a current user ID
    if (!ctx.request.userId) {
      return null
    }
    return ctx.db.query.user(
      {
        where: { id: ctx.request.userId }
      },
      info
    )
  },
  async users(parent, args, ctx, info) {
    // 1. Check if they are logged in
    CheckLogin(ctx)

    // 2. Check if the user has the permissions to query all the users
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE'])

    // 2. if they do, query all the users!
    return ctx.db.query.users({}, info)
  },
  async order(parent, args, ctx, info) {
    console.log('Order Query:', args)
    // 1. Make sure they are logged in
    CheckLogin(ctx)

    // 2. Query the current order
    const order = await ctx.db.query.order(
      {
        where: { id: args.id }
      },
      info
    )
    // 3. Check if the have the permissions to see this order
    const ownsOrder = order.user.id === ctx.request.userId
    const hasPermissionToSeeOrder = ctx.request.user.permissions.includes(
      'ADMIN'
    )
    if (!ownsOrder && !hasPermissionToSeeOrder) {
      throw new Error('You cant see this buddd')
    }
    // 4. Return the order
    return order
  },
  async orders(parent, args, ctx, info) {
    CheckLogin(ctx)
    const { userId } = ctx.request.userId
    return ctx.db.query.orders(
      {
        where: {
          user: { id: userId }
        }
      },
      info
    )
  },
  async hello(parent, args, ctx, info) {
    console.log('Running Hello!')
    return { message: 'Hello!' }
  },
  async userExists(parent, args, ctx, info) {
    console.log('userExists', args.email)
    args.email = args.email.toLowerCase()
    const user = await ctx.db.query.user({
      where: { email: args.email }
    })
    return { message: user !== null }
  }
}
module.exports = Query
