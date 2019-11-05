const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../utils");
const { validateZipcode } = require("../helpers/validateZipcode");
const { getCustomerProfile } = require("../authorizenet/Customer");

const ctxUser = ctx => ctx.request.user;

const Query = {
  me(_, __, { req, db }, info) {
    if (!req.userId) {
      return null;
    }
    return db.query.user(
      {
        where: { id: req.userId }
      },
      info
    );
  },
  async getAuthnetCustomer(_, args, { req, db }, info) {
    const user = await db.query.user({ where: { id: args.id } }, info);
    if (user) {
      const cust = getCustomerProfile({
        customerId: user.authCustomerId,
        paymentId: userargs.id
      });
      return cust;
    }
    return null;
  },
  async validZipCode(_, args) {
    return validateZipcode(args.zipcode);
  },
  users: forwardTo("db"),
  questionnaires: forwardTo("db"),
  async userExists(_, args, ctx) {
    args.email = args.email.toLowerCase();
    // if it's a visitor account we won't enforce the duplicate
    const user = await ctx.db.query.users({
      where: { email: args.email, role_not: "VISITOR" }
    });
    console.log("User=", user);
    return user.length > 0;
  }
};

module.exports = { Query };
