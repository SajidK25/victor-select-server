const Address = {
  user: (parent, _, { prisma }) => {
    return prisma.address({ id: parent.id }).user();
  },
};

module.exports = { Address };
