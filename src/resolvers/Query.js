const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../utils");
const { validateZipcode } = require("../helpers/validateZipcode");
const { getCustomerProfile } = require("../authorizenet/Customer");

const ctxUser = ctx => ctx.request.user;

const Query = {
  me: (_, __, { req, prisma }) => {
    if (!req.userId) {
      return null;
    }
    return prisma.user({ id: req.userId });
  },

  validZipCode: async (_, args) => {
    return validateZipcode(args.zipcode);
  },

  users: async (_, __, { prisma }) => {
    return await prisma.users();
  },

  user: async (_, args, { prisma }) => {
    return await prisma.user({ id: args.id });
  },

  visits: (_, __, { prisma }, info) => {
    return prisma.visits({}, info);
  },

  visitsConnection: async (_, args, { prisma }, info) => {
    return await prisma.visitsConnection(args.first);
  },

  usersConnection: async (_, args, { prisma }) => {
    return await prisma.usersConnection(args.input);
  },

  newVisits: (_, __, { prisma }, info) => {
    return prisma.visits({ where: { status: "PENDING" } }, info);
  },

  visitsCount: async (_, __, { prisma }) => {
    return await prisma
      .visitsConnection()
      .aggregate()
      .count();
  },

  creditCards: (_, __, { prisma }) => {
    return prisma.creditCards();
  },
  userExists: async (_, args, { prisma }) => {
    args.email = args.email.toLowerCase();
    // if it's a visitor account we won't enforce the duplicate
    const user = await prisma.users({
      where: { email: args.email, role_not: "VISITOR" }
    });
    console.log("User=", user);
    return user.length > 0;
  }
};

// const Visit = {
//   user: (parent, _, { prisma }) => {
//     return prisma.visit({ id: parent.id }).user();
//   }
// };

module.exports = { Query };
