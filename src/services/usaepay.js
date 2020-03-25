const got = require("got");
const sha256 = require("sha256");
const { validateArgument } = require("./utils");

const production = "https://usaepay.com/api/v2/";
const sandbox = "https://sandbox.usaepay.com/api/v2/";

const prehash =
  process.env.USAEPAY_APIKEY +
  process.env.USAEPAY_SEED +
  process.env.USAEPAY_PIN;
const apihash = "s2/" + process.env.USAEPAY_SEED + "/" + sha256(prehash);
const authKey = new Buffer.from(
  process.env.USAEPAY_APIKEY + ":" + apihash
).toString("base64");

const usaepayHeaders = {
  Authorization: "Basic " + authKey,
  "Content-Type": "application/json"
};

const usaepayAPI = got.extend({
  headers: usaepayHeaders,
  //  prefixUrl: process.env.NODE_ENV === "development" ? sandbox : production,
  prefixUrl: sandbox,
  json: true,
  responseType: "json",
  resolveBodyOnly: true
});

// This will save a card and return a token
const saveCreditCard = async input => {
  console.log("input", input);
  validateArgument(input, "input");
  validateArgument(input.cardNumber, "input.cardNumber");
  validateArgument(input.cardExpiry, "input.cardExpiry");

  var data = {
    command: "cc:save",
    creditcard: {
      number: input.cardNumber,
      expiration: input.cardExpiry
    }
  };

  if (input.firstName && input.lastName) {
    data.creditcard.cardholder = input.firstName + " " + input.lastName;
  }
  if (input.address) {
    data.creditcard.avs_street = input.address;
  }
  if (input.zipcode) {
    data.creditcard.avs_zip = input.zipcode;
  }
  if (input.cardCVC) {
    data.creditcard.cvc = input.cardCVC;
  }

  console.log("Data:", data);
  const body = await usaepayAPI.post("transactions", {
    json: data
  });

  console.log("Body:", body);
  console.log("Code", body.result_code);
  if (!body || body.result_code !== "A") {
    throw new Error("Card not approved");
  }
  if (!body.savedcard || !body.savedcard.cardnumber) {
    throw new Error("Card could not be saved");
  }

  return body.savedcard;
};

const releaseAuthorization = async refnum => {
  validateArgument(refnum, "refnum");

  console.log("refnum:", refnum);

  var data = {
    command: "cc:void:release",
    refnum: refnum
  };

  console.log("Data:", data);
  const body = await usaepayAPI.post("transactions", {
    json: data
  });

  console.log("Body:", body);
  console.log("Code", body.result_code);

  return body;
};

const makePayment = async input => {
  console.log("input", input);
  validateArgument(input, "input");
  validateArgument(input.amount, "input.amount");
  validateArgument(input.ccToken, "input.ccToken");
  validateArgument(input.cardholder, "input.cardholder");
  validateArgument(input.email, "input.email");

  console.log("Input:", input);

  var data = {
    command: "cc:sale",
    amount: input.amount / 100,
    creditcard: {
      number: input.ccToken,
      cardholder: input.cardholder
    },
    email: input.email,
    send_receipt: true,
    description: "Victory Select"
  };

  console.log("Data:", data);
  const body = await usaepayAPI.post("transactions", {
    json: data
  });

  console.log("Body:", body);
  console.log("Code", body.result_code);
  if (!body || body.result_code !== "A") {
    throw new Error("Card not approved");
  }

  return { resultCode: body.result_code, refnum: body.refnum };
};

module.exports = { saveCreditCard, releaseAuthorization, makePayment };
