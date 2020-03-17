/**
 * Modules from the community: package.json
 */
const got = require("got");

const {
  usaepayHeaders,
  validateArgument,
  throwInvalidDataError
} = require("./utils");

var production = "https://usaepay.com/api/v2/";
var sandbox = "https://sandbox.usaepay.com/api/v2/";

const usaepayAPI = got.extend({
  headers: usaepayHeaders,
  //  prefixUrl: process.env.NODE_ENV === "development" ? sandbox : production,
  prefixUrl: sandbox,
  json: true,
  responseType: "json",
  resolveBodyOnly: true
});

// This will save a card and run a authorization for $1.00
const saveCreditCard = async input => {
  console.log("input", input);
  validateArgument(input, "input");
  validateArgument(input.cardNumber, "input.cardNumber");
  validateArgument(input.cardExpiry, "input.cardExpiry");

  var data = {
    command: "cc:authonly",
    amount: 1.0,
    creditcard: {
      number: input.cardNumber,
      expiration: input.cardExpiry
    },
    save_card: true
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
  // Release authorization
  const result = await releaseAuthorization({ input: { refnum: body.refnum } });
  console.log("Release result", result);

  return body.savedcard;
};

const releaseAuthorization = async input => {
  console.log("input", input);
  validateArgument(input, "input");
  validateArgument(input.refnum, "input.refnum");

  var data = {
    command: "cc:void:release",
    refnum: input.refnum
  };

  console.log("Data:", data);
  const body = await usaepayAPI.post("transactions", {
    json: data
  });

  console.log("Body:", body);
  console.log("Code", body.result_code);
  // if (!body || body.result_code !== "A") {
  //   throw new Error("Auth not released");
  // }

  return body;
};

const makePayment = async input => {
  console.log("input", input);
  validateArgument(input, "input");
  validateArgument(input.ccToken, "input.ccToken"); // Token or card number
  validateArgument(input.ccExpire, "input.ccExpire");

  var data = {
    command: "cc:sale",
    amount: 1.0,
    creditcard: {
      number: input.cardNumber,
      expiration: input.expiration
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
  if (input.cvv) {
    data.creditcard.cvc = input.cvv;
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

// {
//     var self = this;

//     self.Card = {
//         Create: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.cardNumber, 'options.cardNumber');
//             self.Util.validateArgument(options.exp, 'options.exp');

//             var data = {
//                 'command': 'cc:save',
//                 'creditcard':
//                 {
//                     'number': options.cardNumber,
//                     'expiration': options.exp
//                 }
//             };

//             if (options.firstName && options.lastName)
//             {
//                 data.creditcard.cardholder = options.firstName + ' ' + options.lastName;
//             }
//             if (options.address)
//             {
//                 data.creditcard.avs_street = options.address;
//             }
//             if (options.zipcode)
//             {
//                 data.creditcard.avs_zip = options.zipcode;
//             }
//             if (options.cvv)
//             {
//                 data.creditcard.cvc = options.cvv;
//             }

//             return got.post(self.baseUrl + 'transactions',
//             {
//                 body: data,
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body || res.body.result_code !== 'A')
//                 {
//                     throw new Error('Card not approved');
//                 }

//                 if (!res.body.savedcard || !res.body.savedcard.cardnumber)
//                 {
//                     throw new Error('Card could not be saved');
//                 }

//                 return res.body.savedcard.cardnumber;
//             });
//         },
//         Sale: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.amount, 'options.amount');
//             self.Util.validateArgument(options.foreignKey, 'options.foreignKey');

//             var data = {
//                 'command': 'cc:sale',
//                 'creditcard':
//                 {
//                     'number': options.foreignKey,
//                     'expiration': '0000'
//                 },
//                 'amount': options.amount
//             };

//             return got.post(self.baseUrl + 'transactions',
//             {
//                 body: data,
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body || res.body.result_code !== 'A' || !res.body.refnum)
//                 {
//                     throw new Error('Transaction not approved');
//                 }

//                 return res.body.refnum;
//             });
//         },
//         Void: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.transactionForeignKey, 'options.transactionForeignKey');

//             var data = {
//                 'command': 'void',
//                 'refnum': options.transactionForeignKey
//             };

//             return got.post(self.baseUrl + 'transactions',
//             {
//                 body: data,
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body || res.body.result_code !== 'A' || !res.body.refnum)
//                 {
//                     throw new Error('Transaction not voided');
//                 }

//                 return res.body.refnum;
//             });
//         },
//         Refund: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.transactionForeignKey, 'options.transactionForeignKey');

//             var data = {
//                 'command': 'refund',
//                 'amount': otions.amount,
//                 'refnum': options.transactionForeignKey
//             };

//             return got.post(self.baseUrl + 'transactions',
//             {
//                 body: data,
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body || res.body.result_code !== 'A' || !res.body.refnum)
//                 {
//                     throw new Error('Transaction not refunded');
//                 }

//                 return res.body.refnum;
//             });
//         }
//     };

//     self.Terminal = {
//         Create: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.name, 'options.name');

//             var data = {
//                 'terminal_type': 'standalone',
//                 'name': options.name
//             };

//             if (options.config)
//             {
//                 data.terminal_config = options.config;
//             }
//             if (options.settings)
//             {
//                 data.settings = options.settings;
//             }

//             return got.post(self.baseUrl + 'paymentengine/devices',
//             {
//                 body: data,
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body || !res.body.key || !res.body.pairing_code)
//                 {
//                     throw new Error('Terminal could not be created');
//                 }

//                 return {
//                     foreignKey: res.body.key,
//                     pairingCode: res.body.pairing_code
//                 };
//             });
//         },
//         Delete: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.foreignKey, 'options.foreignKey');

//             return got.delete(self.baseUrl + 'paymentengine/devices/' + options.foreignKey,
//             {
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body)
//                 {
//                     throw new Error('Terminal not removed');
//                 }

//                 return true;
//             });
//         },
//         Sale: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.amount, 'options.amount');
//             self.Util.validateArgument(options.foreignKey, 'options.foreignKey');

//             var data = {
//                 'devicekey': options.foreignKey,
//                 'amount': options.amount,
//                 'command': 'sale'
//             };

//             return got.post(self.baseUrl + 'paymentengine/payrequests',
//             {
//                 body: data,
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body || !res.body.key)
//                 {
//                     throw new Error('Terminal transaction not created');
//                 }

//                 return res.body.key;
//             });
//         },
//         SaleStatus: function (options)
//         {
//             self.Util.validateArgument(options, 'options');
//             self.Util.validateArgument(options.foreignKey, 'options.foreignKey');

//             return got.get(self.baseUrl + 'paymentengine/payrequests/' + options.foreignKey,
//             {
//                 json: true,
//                 headers:
//                 {
//                     'Authorization': 'Basic ' + self.authKey,
//                     'Content-Type': 'application/json'
//                 }
//             }).then(function (res)
//             {
//                 if (!res) self.Util.throwInvalidDataError(res);

//                 if (!res.body || !res.body.key || !res.body.status)
//                 {
//                     throw new Error('Terminal transaction not available');
//                 }

//                 var pendingStatuses = [
//                     'sending to device',
//                     'sent to device',
//                     'waiting for card dip',
//                     'changing interfaces',
//                     'customer see phone and tap again',
//                     'processing payment',
//                     'completing payment',
//                     'capturing signature'
//                 ];

//                 var successStatuses = ['transaction complete'];
//                 // var errorStatuses = [
//                 //     'signature capture error',
//                 //     'canceled',
//                 //     'transaction canceled',
//                 //     'transaction failed',
//                 //     'timeout',
//                 //     'error'
//                 // ];

//                 if (res.body.transaction && res.body.transaction.result_code === 'E')
//                 {
//                     return {
//                         status: 'error',
//                         message: res.body.transaction.error
//                     };
//                 }

//                 if (res.body.transaction && res.body.transaction.result_code === 'D')
//                 {
//                     return {
//                         status: 'error',
//                         message: res.body.transaction.error
//                     };
//                 }

//                 if (successStatuses.indexOf(res.body.status) > -1)
//                 {
//                     return {
//                         status: 'success',
//                         transaction: res.body.transaction.refnum
//                     };
//                 }
//                 if (pendingStatuses.indexOf(res.body.status) > -1)
//                 {
//                     return {
//                         status: 'pending',
//                         message: res.body.status
//                     };
//                 }

//                 return {
//                     status: 'error',
//                     message: res.body.status
//                 };
//             });
//         }
//     };

//     return self;
// };

module.exports = { saveCreditCard, releaseAuthorization };
