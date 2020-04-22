const { hasPermission } = require("../utils");
const { validateZipcode } = require("../helpers/validateZipcode");
const { getAuthorizedUserId, validateUser } = require("../auth");
const { getCurrentCreditCard } = require("./Helpers");
const moment = require("moment");

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

  messages: async (_, args, { prisma, req }) => {
    return await prisma.messages();
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
    return prescription;
  },

  order: async (_, { id }, { prisma }) => {
    const order = await prisma.order({ id: id });
    return order;
  },

  orders: async (_, { status = "PENDING" }, { prisma, req }) => {
    await validateUser(req, true);
    let variables = {
      orderBy: "createdAt_ASC",
      where: { status: status },
    };

    return await prisma.orders(variables);
  },

  pendingPrescriptions: async (_, __, { prisma, req }) => {
    await validateUser(req, true);
    const variables = {
      orderBy: "updatedAt_ASC",
      where: {
        OR: [
          { status: "PENDING" },
          {
            AND: [
              { status_in: ["DENIED", "ACTIVE"] },
              {
                approvedDate_gt: moment()
                  .subtract(3, "days")
                  .format(),
              },
            ],
          },
        ],
      },
      //
    };

    return await prisma.prescriptions(variables);
  },
  getMessagesByPrescription: async (_, { prescriptionId }, { prisma, req }) => {
    return await prisma.prescription({ id: prescriptionId }).messages();
  },

  getPatientChat: async (_, { prescriptionId }, { prisma, req }) => {
    await validateUser(req);

    return await prisma
      .prescription({ id: prescriptionId })
      .messages({ where: { private: false } });
  },

  getPatientMessages: async (_, __, { prisma, req }) => {
    return await prisma.messages({
      where: {
        fromPatient: true,
      },
      orderBy: "createdAt_DESC",
    });
  },

  physicianListPrescriptions: async (_, __, { prisma, req }) => {
    const variables = {
      where: {
        OR: [
          { status: "PENDING" },
          {
            AND: [
              { status_in: ["DENIED", "ACTIVE"] },
              {
                approvedDate_gt: moment()
                  .subtract(14, "days")
                  .format(),
              },
            ],
          },
        ],
      },
    };

    return await prisma.prescriptions(variables);
  },

  prescriptions: async (
    _,
    { pageSize = 20, after, status = "PENDING" },
    { prisma, req }
  ) => {
    await validateUser(req, true);
    let variables = {
      orderBy: "createdAt_ASC",
      first: pageSize,
      after: after,
      where: { status: status },
    };

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
      where: { status: status },
    };

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

  getPatientPrescriptions: async (_, { userId }, { prisma, req }) => {
    const payload = await validateUser(req, false);
    console.log("payload", payload);

    if (!userId) {
      userId = payload.userId;
    }
    console.log("userId", userId);

    return await prisma.user({ id: userId }).prescriptions();
  },

  getRecentPrescriptionMessage: async (
    _,
    { prescriptionId },
    { prisma, req }
  ) => {
    await validateUser(req);

    const messages = await prisma
      .prescription({ id: prescriptionId })
      .messages({
        orderBy: "createdAt_DESC",
        where: { fromPatient: false, private: false },
      });
    if (messages) {
      return messages[0];
    }
    return null;
  },

  creditCards: async (_, __, { prisma }) => {
    await validateUser(req, true);
    return prisma.creditCards();
  },

  getUserCreditCard: async (_, __, { prisma, req }) => {
    const payload = await validateUser(req);

    return await getCurrentCreditCard(payload.userId, prisma);
  },

  userExists: async (_, args, { prisma }) => {
    args.email = args.email.toLowerCase();
    // if it's a visitor account we won't enforce the duplicate
    const user = await prisma.users({
      where: { email: args.email, role_not: "VISITOR" },
    });
    console.log("User=", user);
    return user.length > 0;
  },
};

// const Visit = {
//   user: (parent, _, { prisma }) => {
//     return prisma.visit({ id: parent.id }).user();
//   }
// };

module.exports = { Query };
