"use strict";

function getRandomString(text) {
  return text + Math.floor(Math.random() * 100000 + 1);
}

function getRandomInt() {
  return Math.floor(Math.random() * 100000 + 1);
}

function getRandomAmount() {
  return (Math.random() * 100 + 1).toFixed(2);
}

function getDate() {
  return new Date().toISOString().substring(0, 10);
}

function hasPermission(user, permissionsNeeded) {
  const matchedPermissions = user.permissions.filter(permissionTheyHave =>
    permissionsNeeded.includes(permissionTheyHave)
  );
  if (!matchedPermissions.length) {
    throw new Error(`${user.name}, you do not have sufficient permissions

      : ${permissionsNeeded}

      You Have:

      ${user.permissions}
      `);
  }
}

const setPricing = async (subscription, prisma) => {
  const product = await prisma.product({
    productId: subscription.drugId + subscription.doseOption
  });
  const addon = await prisma.product({
    productId: subscription.addOnId + "ADDON"
  });

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

exports.hasPermission = hasPermission;
module.exports.getRandomString = getRandomString;
module.exports.getRandomInt = getRandomInt;
module.exports.getRandomAmount = getRandomAmount;
module.exports.getDate = getDate;
module.exports.setPricing = setPricing;
