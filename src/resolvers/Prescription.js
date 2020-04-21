const Prescription = {
  user: (parent, _, { prisma }) => {
    return prisma.prescription({ id: parent.id }).user();
  },
  visit: (parent, _, { prisma }) => {
    return prisma.prescription({ id: parent.id }).visit();
  },
  product: (parent, _, { prisma }) => {
    return prisma.prescription({ id: parent.id }).product();
  },
  addon: (parent, _, { prisma }) => {
    return prisma.prescription({ id: parent.id }).addon();
  },
  orders: (parent, _, { prisma }) => {
    return prisma.prescription({ id: parent.id }).orders();
  },
  messages: (parent, _, { prisma }) => {
    return prisma.prescription({ id: parent.id }).messages();
  },
};

module.exports = { Prescription };
