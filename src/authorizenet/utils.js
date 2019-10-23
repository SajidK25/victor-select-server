var ApiContracts = require("authorizenet").APIContracts;

const getMerchantAuth = () => {
  var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(process.env.AUTHORIZENET_LOGINID);
  merchantAuthenticationType.setTransactionKey(
    process.env.AUTHORIZENET_TRANSACTIONKEY
  );

  return merchantAuthenticationType;
};

module.exports = { getMerchantAuth };
