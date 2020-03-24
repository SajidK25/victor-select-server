const Message = {
  physician: ({ id }, _, { prisma }) => {
    return prisma.message({ id }).physician();
  },
  user: ({ id }, _, { prisma }) => {
    return prisma.message({ id }).user();
  },
  prescription: ({ id }, _, { prisma }) => {
    return prisma.message({ id }).prescription();
  }
};

module.exports = { Message };
