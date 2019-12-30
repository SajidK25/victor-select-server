const sha256 = require("sha256");

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

const validateArgument = (arg, name) => {
  if (arg === null || arg === undefined) {
    throw new Error("Required argument missing: " + name);
  }
};

const throwInvalidDataError = res => {
  throw new Error("Invalid response data: " + JSON.stringify(res));
};

module.exports = { usaepayHeaders, validateArgument, throwInvalidDataError };
