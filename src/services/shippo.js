const shippo = require("shippo")(process.env.SHIPPO_TOKEN);
const { validateArgument } = require("./utils");

const validateAddress = async input => {
  validateArgument(input, "input");
  validateArgument(input.addressOne, "input.addressOne");
  validateArgument(input.addressTwo, "input.addressTwo");
  validateArgument(input.city, "input.city");
  validateArgument(input.state, "input.state");
  validateArgument(input.name, "input.name");

  let address = {};
  try {
    address = await shippo.address.create({
      name: input.name,
      street1: input.addressOne,
      street2: input.addressTwo,
      city: input.city,
      state: input.state,
      zip: input.zipcode,
      country: "US",
      email: input.email,
      validate: true
    });
  } catch (err) {
    console.log("validateAddressError", err);
  }

  console.log("Address", address);
  return address;
};

module.exports = { validateAddress };
