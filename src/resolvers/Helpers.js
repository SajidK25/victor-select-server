const {
  saveCreditCard,
  authorizeAndSaveCreditCard,
} = require("../services/usaepay");
const { validateAddress } = require("../services/shippo");

const getCurrentCreditCard = async (userId, prisma) => {
  const creditcards = await prisma
    .user({ id: userId })
    .creditCards({ where: { active: true } });

  console.log("Credit Cards:", creditcards);

  return creditcards[0];
};

const updateCreditCard = async (userId, cardInput, prisma) => {
  const response = await authorizeAndSaveCreditCard(cardInput);
  console.log("CC Response:", response);

  if (response.result_code !== "A") {
    throw new Error("Unable to verify credit card.");
  }

  const savedCard = response.savedcard;

  let newCC = null;
  if (savedCard) {
    // Update all current user credit cards to inactive
    await prisma.updateManyCreditCards({
      where: { user: { id: userId }, active: true },
      data: { active: false },
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
          id: userId,
        },
      },
    });
  }

  return newCC;
};

const getCurrentAddress = async (userId, prisma) => {
  const addresses = await prisma
    .user({ id: userId })
    .addresses({ where: { active: true } });

  if (addresses.length) return addresses[0];

  return null;
};

const updateAddress = async ({ user, addressInput, prisma }) => {
  let address = await getCurrentAddress(user.id, prisma);
  // There's nothing to do here
  if (!address && !addressInput) return;

  // No new address sent so use the current one
  const newAddressInput = !addressInput
    ? {
        name: user.firstName + " " + user.lastName,
        email: user.email,
        addressOne: address.addressOne,
        addressTwo: address.addressTwo,
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
        telephone: address.telephone,
      }
    : addressInput;

  const shippoInput = {
    name: user.firstName + " " + user.lastName,
    ...newAddressInput,
  };

  let shippoId = "";
  const shippoRet = await validateAddress(shippoInput);
  if (shippoRet) {
    shippoId = shippoRet.shippoId;
  }

  const upsertAddressInput = {
    ...newAddressInput,
    active: true,
    shippoId: shippoId,
    user: {
      connect: {
        id: user.id,
      },
    },
  };

  if (!address) {
    address = await prisma.createAddress({
      ...upsertAddressInput,
    });
  } else {
    address = await prisma.updateAddress({
      where: { id: address.id },
      data: {
        ...upsertAddressInput,
      },
    });
  }

  return address;
};

const setPricing = async (subscription, prisma) => {
  const product = await prisma.product({
    productId: subscription.drugId + subscription.doseOption,
  });
  let addon = null;
  if (subscription.addOnId !== "NO_ADDON") {
    addon = await prisma.product({
      productId: subscription.addOnId + "ADDON",
    });
  }

  let shippingInterval = 0;
  let price = 0;
  const dosesPerMonth = !subscription.dosesPerMonth
    ? 1
    : subscription.dosesPerMonth;

  switch (subscription.shippingInterval) {
    case "everyThree":
      shippingInterval = 3;
      if (product) price = product.threeMonthPrice * dosesPerMonth;
      if (addon) price += addon.threeMonthPrice * 30;
      break;

    case "everyTwo":
      shippingInterval = 2;
      if (product) price = product.twoMonthPrice * dosesPerMonth;
      if (addon) price += addon.twoMonthPrice * 30;
      break;

    case "monthly":
      shippingInterval = 1;
      if (product) price = product.monthlyPrice * dosesPerMonth;
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
  setPricing,
};
