const Message = {
  physician: ({ id }, _, { prisma }) => {
    return prisma.message({ id }).user();
  },
  user: ({ id }, _, { prisma }) => {
    return prisma.message({ id }).user();
  },
  visit: ({ id }, _, { prisma }) => {
    return prisma.message({ id }).visit();
  }
};

module.exports = { Message };
