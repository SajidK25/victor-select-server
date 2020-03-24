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
  console.log("TmpAddress", tmpAddress);

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

const setPricing = async (subscription, prisma) => {
  const product = await prisma.product({
    productId: subscription.drugId + subscription.doseOption
  });
  let addon = null;
  if (subscription.addOnId !== "NO_ADDON") {
    addon = await prisma.product({
      productId: subscription.addOnId + "ADDON"
    });
  }

  let shippingInterval = 0;
  let price = 0;

  switch (subscription.shippingInterval) {
    case "everyThree":
      shippingInterval = 3;
      if (product) price = product.threeMonthPrice * subscription.dosesPerMonth;
      if (addon) price += addon.threeMonthPrice * 30;
      break;

    case "everyTwo":
      shippingInterval = 2;
      if (product) price = product.twoMonthPrice * subscription.dosesPerMonth;
      if (addon) price += addon.twoMonthPrice * 30;
      break;

    case "monthly":
      shippingInterval = 1;
      if (product) price = product.monthlyPrice * subscription.dosesPerMonth;
      if (addon) price += addon.monthlyPrice * 30;
      break;

    default:
  }
  const amountDue = shippingInterval * price;
  return { shippingInterval, amountDue };
};

module.exports = {
  getCurrentCreditCard,
  updateAddress,
  updateCreditCard,
  getCurrentAddress,
  setPricing
};
