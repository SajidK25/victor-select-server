const User = {
  email: {
    fragment: `fragment UserId on User { id }`,
    resolve: (parent, args, ctx, info) => {
      return parent.email
    }
  }
}

module.exports = { User }
