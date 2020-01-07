const Visit = {
  user: (parent, _, { prisma }) => {
    return prisma.visit({ id: parent.id }).user();
  }
};

module.exports = { Visit };
