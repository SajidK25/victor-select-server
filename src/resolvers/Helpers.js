const { saveCreditCard } = require("../usaepay/usaepay");

const getCurrentCreditCard = async (userId, prisma) => {
  const creditcards = await prisma
    .user({ id: userId })
    .creditCards({ where: { active: true } });

  return creditcards[0];
};

const updateCreditCard = async (userId, cardInput, prisma) => {
  const savedCard = await saveCreditCard(cardInput);
  let newCC = null;
  if (savedCard) {
    // Update all current user credit cards to inactive
    await prisma.updateManyCreditCards({
      where: { user: { id: userId }, active: true },
      data: { active: false }
    });
    // Save new active card
    newCC = await prisma.createCreditCard({
      ccType: savedCard.type,
      ccToken: savedCard.key,
      ccNumber: savedCard.cardnumber,
      ccExpire: cardInput.cardExpiry,
      active: true,
      user: {
        connect: {
          id: userId
        }
      }
    });
  }

  return newCC;
};

const getCurrentAddress = async (userId, prisma) => {
  const addresses = await prisma
    .user({ id: userId })
    .addresses({ where: { active: true } });

  return addresses[0];
};

const updateAddress = async (userId, addressInput, prisma) => {
  await prisma.updateManyAddresses({
    where: { user: { id: userId }, active: true },
    data: { active: false }
  });

  // See if there is a matching address
  const [tmpAddress] = await prisma.addresses({
    where: {
      user: { id: userId },
      ...addressInput
    }
  });

  let address = null;
  if (!tmpAddress) {
    address = await prisma.createAddress({
      ...addressInput,
      active: true,
      user: {
        connect: {
          id: userId
        }
      }
    });
  } else {
    address = await prisma.updateAddress({
      where: { id: tmpAddress.id },
      data: {
        active: true
      }
    });
  }

  return address;
};

module.exports = {
  getCurrentCreditCard,
  updateAddress,
  updateCreditCard,
  getCurrentAddress
};
