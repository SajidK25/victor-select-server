const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../utils");
const { validateZipcode } = require("../helpers/validateZipcode");
const { validateUser } = require("./Mutation");
const { getCustomerProfile } = require("../authorizenet/Customer");

const ctxUser = ctx => ctx.request.user;

const Query = {
  me: (_, __, { req, prisma }) => {
    if (!req.userId) {
      return null;
    }
    return prisma.user({ id: req.userId });
  },

  physician: async (_, __, { req, prisma }) => {
    if (!req.userId) {
      return null;
    }
    const user = await prisma.user({ id: req.userId });
    console.log("Physician:", user);

    if (!user || user.role !== "PHYSICIAN") {
      return null;
    }

    return user;
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

  visit: async (_, { id }, { prisma }) => {
    return await prisma.visit({ id: id });
  },

  visits: async (
    _,
    { pageSize = 20, after, status = "PENDING" },
    { prisma, req },
    info
  ) => {
    await validateUser(req.userId, prisma);
    let variables = {
      orderBy: "createdAt_ASC",
      first: pageSize,
      after: after,
      where: { status: status }
    };

    console.log("Variables:", variables);

    return await prisma.visitsConnection(variables);
  },

  usersConnection: async (_, args, { prisma }) => {
    return await prisma.usersConnection(args.input);
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
