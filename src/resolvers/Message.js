const Message = {
  physician: (parent, _, { prisma }) => {
    return prisma.message({ id: parent.id }).physician();
  },
  user: (parent, _, { prisma }) => {
    return prisma.message({ id: parent.id }).user();
  },
  prescription: (parent, _, { prisma }) => {
    return prisma.message({ id: parent.id }).prescription();
  }
};

module.exports = { Message };
