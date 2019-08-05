const bcrypt = require('bcryptjs')
const { sign } = require('jsonwebtoken')
const { createTokens } = require('../auth')

async function createPrismaUser(ctx, idToken) {
  const user = await ctx.db.mutation.createUser({
    data: {
      identity: idToken.sub.split(`|`)[0],
      auth0id: idToken.sub.split(`|`)[1],
      name: idToken.name,
      email: idToken.email
    }
  })
  return user
}

const ctxUser = ctx => ctx.request.user

const Mutation = {
  logout: async (_, __, { res, req }) => {
    req.userId = null
    res.clearCookie('access-token')
    res.clearCookie('refresh-token')
    return true
  },
  register: async (_, args, { db }, info) => {
    args.email = args.email.toLowerCase()
    const user = await db.query.user({ where: { email: args.email } })
    if (user) {
      return true
    }

    const hashedPassword = await bcrypt.hash(args.password, 10)
    console.log(args.email)
    try {
      const user = await db.mutation.createUser({
        data: {
          ...args,
          password: hashedPassword
        }
      })
    } catch (e) {
      console.log(e)
    }

    return true
  },
  login: async (_, { email, password }, { req, res, db }) => {
    email = email.toLowerCase()
    const user = await db.query.user({ where: { email } })
    console.log('Login User:', user)
    if (!user) {
      return null
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return null
    }

    const tokens = createTokens(user)
    console.log('Tokens:', tokens)

    res.cookie('refresh-token', tokens.refreshToken)
    res.cookie('access-token', tokens.accessToken)

    return user
  },
  invalidateTokens: async (_, __, { req, db }) => {
    console.log('Invalidate:', req)
    if (!req.userId) {
      return false
    }

    const user = await db.query.user({ where: { id: req.userId } })
    if (!user) {
      return false
    }
    const count = user.count + 1
    await db.mutation.updateUser({ data: { count }, where: { id: req.userId } })
    res.clearCookie('access-token')

    return true
  }
}

module.exports = { Mutation }
