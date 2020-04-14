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
  const matchedPermissions = user.permissions.filter((permissionTheyHave) =>
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

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = {
  hasPermission,
  getRandomString,
  getRandomInt,
  getRandomAmount,
  getDate,
  asyncForEach,
};
