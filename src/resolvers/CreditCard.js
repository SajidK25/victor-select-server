const CreditCard = {
  user: (parent, _, { prisma }) => {
    return prisma.creditCard({ id: parent.id }).user();
  }
};

module.exports = { CreditCard };
