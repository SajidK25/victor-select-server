const got = require("got");
const sha256 = require("sha256");
const { validateArgument } = require("./utils");

var paymentUrl;
var paymentAPI;

if (process.env.PAYMENT_MODE === "TEST") {
  paymentUrl = "https://sandbox.usaepay.com/api/v2/";
  paymentAPI = process.env.USAEPAYTEST_APIKEY;
  paymentPin = process.env.USAEPAYTEST_PIN;
} else {
  paymentUrl = "https://usaepay.com/api/v2/";
  paymentAPI = process.env.USAEPAYLIVE_APIKEY;
  paymentPin = process.env.USAEPAYLIVE_PIN;
}

const prehash = paymentAPI + process.env.USAEPAY_SEED + paymentPin;

const apihash = "s2/" + process.env.USAEPAY_SEED + "/" + sha256(prehash);

const authKey = new Buffer.from(paymentAPI + ":" + apihash).toString("base64");

const usaepayHeaders = {
  Authorization: "Basic " + authKey,
  "Content-Type": "application/json",
};

const usaepayAPI = got.extend({
  headers: usaepayHeaders,
  //  prefixUrl: process.env.NODE_ENV === "development" ? sandbox : production,
  // prefixUrl: sandbox,
  prefixUrl: paymentUrl,
  json: true,
  responseType: "json",
  resolveBodyOnly: true,
});

const authorizeAndSaveCreditCard = async (input) => {
  validateArgument(input, "input");
  validateArgument(input.cardNumber, "input.cardNumber");
  validateArgument(input.cardExpiry, "input.cardExpiry");

  var data = {
    command: "cc:authonly",
    amount: "1.00",
    save_card: true,
    creditcard: {
      number: input.cardNumber,
      expiration: input.cardExpiry,
    },
    send_receipt: false,
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

  let body = null;
  try {
    body = await usaepayAPI.post("transactions", {
      json: data,
    });
  } catch (err) {
    console.log(err);
    throw new Error("Unable to contact card processor.");
  }

  if (!body) return { result_code: "ERR" };

  return body;
};

// This will save a card and return a token
const saveCreditCard = async (input) => {
  validateArgument(input, "input");
  validateArgument(input.cardNumber, "input.cardNumber");
  validateArgument(input.cardExpiry, "input.cardExpiry");

  var data = {
    command: "cc:save",
    creditcard: {
      number: input.cardNumber,
      expiration: input.cardExpiry,
    },
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

  let body = null;
  try {
    body = await usaepayAPI.post("transactions", {
      json: data,
    });
  } catch (err) {
    console.log("Error", err);
  }

  if (!body || body.result_code !== "A") {
    throw new Error("Card not approved");
  }
  if (!body.savedcard || !body.savedcard.cardnumber) {
    throw new Error("Card could not be saved");
  }

  return body.savedcard;
};

const releaseAuthorization = async (refnum) => {
  validateArgument(refnum, "refnum");

  var data = {
    command: "cc:void:release",
    refnum: refnum,
  };

  const body = await usaepayAPI.post("transactions", {
    json: data,
  });

  return body;
};

const makePayment = async (input) => {
  validateArgument(input, "input");
  validateArgument(input.amount, "input.amount");
  validateArgument(input.ccToken, "input.ccToken");
  validateArgument(input.cardholder, "input.cardholder");
  validateArgument(input.email, "input.email");

  var data = {
    command: "cc:sale",
    amount: input.amount / 100,
    creditcard: {
      number: input.ccToken,
      cardholder: input.cardholder,
    },
    email: input.email,
    send_receipt: true,
    description: "Victory Select",
  };

  const body = await usaepayAPI.post("transactions", {
    json: data,
  });

  if (!body || body.result_code !== "A") {
    throw new Error("Card not approved");
  }

  return { resultCode: body.result_code, refnum: body.refnum };
};

module.exports = {
  saveCreditCard,
  authorizeAndSaveCreditCard,
  releaseAuthorization,
  makePayment,
};
