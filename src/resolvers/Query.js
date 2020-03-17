const { hasPermission } = require("../utils");
const { validateZipcode } = require("../helpers/validateZipcode");
const { getAuthorizedUserId, validateUser } = require("../auth");
const { getCustomerProfile } = require("../authorizenet/Customer");

const Query = {
  me: async (_, __, { req, prisma }) => {
    const payload = getAuthorizedUserId(req);
    if (!payload) {
      return null;
    }

    return await prisma.user({ id: payload.userId });
  },

  admin: async (_, __, { req, prisma }) => {
    const payload = validateUser(req, true);
    if (!payload) {
      return null;
    }

    return await prisma.user({ id: payload.userId });
  },

  validZipCode: async (_, args) => {
    return validateZipcode(args.zipcode);
  },

  users: async (_, __, { prisma, req }) => {
    await validateUser(req, true);
    return await prisma.users();
  },

  user: async (_, args, { prisma }) => {
    return await prisma.user({ id: args.id });
  },

  visit: async (_, { id }, { prisma }) => {
    return await prisma.visit({ id: id });
  },

  prescription: async (_, { id }, { prisma }) => {
    const prescription = await prisma.prescription({ id: id });
    console.log("Prescription:", prescription);
    return prescription;
  },

  order: async (_, { id }, { prisma }) => {
    const order = await prisma.order({ id: id });
    console.log("Order:", order);
    return order;
  },

  orders: async (
    _,
    { pageSize = 20, after, status = "PENDING" },
    { prisma, req },
    info
  ) => {
    await validateUser(req, true);
    let variables = {
      orderBy: "createdAt_ASC",
      first: pageSize,
      after: after,
      where: { status: status }
    };

    console.log("Variables:", variables);

    return await prisma.ordersConnection(variables);
  },

  prescriptions: async (
    _,
    { pageSize = 20, after, status = "PENDING" },
    { prisma, req },
    info
  ) => {
    await validateUser(req, true);
    let variables = {
      orderBy: "createdAt_ASC",
      first: pageSize,
      after: after,
      where: { status: status }
    };

    console.log("Variables:", variables);

    return await prisma.prescriptionsConnection(variables);
  },

  visits: async (
    _,
    { pageSize = 20, after, status = "PENDING" },
    { prisma, req },
    info
  ) => {
    await validateUser(req, true);
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

  creditCards: async (_, __, { prisma }) => {
    await validateUser(req, true);
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
