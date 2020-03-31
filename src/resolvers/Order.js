const Order = {
  user: (parent, _, { prisma }) => {
    return prisma.order({ id: parent.id }).user();
  },
  prescription: (parent, _, { prisma }) => {
    return prisma.order({ id: parent.id }).prescription();
  },
  creditCard: (parent, _, { prisma }) => {
    return prisma.order({ id: parent.id }).creditCard();
  }
};

module.exports = { Order };
