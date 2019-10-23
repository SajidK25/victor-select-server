"use strict";

var ApiContracts = require("authorizenet").APIContracts;
var ApiControllers = require("authorizenet").APIControllers;
var { getMerchantAuth } = require("./utils");
var utils = require("../utils.js");

const executeRequest = ctrl => {
  return new Promise((resolve, reject) => {
    ctrl.execute(() => {
      var apiResponse = ctrl.getResponse();
      resolve(apiResponse);
    });
  });
};

const processRequest = ctrl => {
  return new Promise((resolve, reject) => {
    ctrl.execute(function() {
      console.log("getResponse");
      var apiResponse = ctrl.getResponse();
      console.log("apiResponse =", apiResponse);
      var response = new ApiContracts.CreateCustomerProfileResponse(
        apiResponse
      );
      if (response == null) {
        reject("No response");
      }

      if (
        response.getMessages().getResultCode() ===
        ApiContracts.MessageTypeEnum.OK
      ) {
        resolve(response);
      }

      var error = {
        code: response.getMessages().getResultCode(),
        message: response
          .getMessages()
          .getMessage()[0]
          .getCode()
      };
      reject(error);
      // something went wrong
    });
  });
};

const createCustomerProfile = async props => {
  var creditCard = new ApiContracts.CreditCardType();
  creditCard.setCardNumber("4242424242424242");
  creditCard.setExpirationDate("0822");

  var paymentType = new ApiContracts.PaymentType();
  paymentType.setCreditCard(creditCard);

  var customerAddress = new ApiContracts.CustomerAddressType();
  customerAddress.setFirstName(props.firstName);
  customerAddress.setLastName(props.lastName);
  customerAddress.setAddress(props.address);
  customerAddress.setCity(props.city);
  customerAddress.setState(props.state);
  customerAddress.setZip(props.zipCode);
  customerAddress.setCountry("USA");
  customerAddress.setPhoneNumber(props.telephone);

  var customerPaymentProfileType = new ApiContracts.CustomerPaymentProfileType();
  customerPaymentProfileType.setCustomerType(
    ApiContracts.CustomerTypeEnum.INDIVIDUAL
  );
  customerPaymentProfileType.setPayment(paymentType);
  customerPaymentProfileType.setBillTo(customerAddress);
  customerPaymentProfileType.setDefaultPaymentProfile(true);

  var paymentProfilesList = [];
  paymentProfilesList.push(customerPaymentProfileType);

  var customerProfileType = new ApiContracts.CustomerProfileType();
  //customerProfileType.setMerchantCustomerId(
  //  "M_" + utils.getRandomString("cust")
  //);
  // customerProfileType.setDescription("Victory Select Patient");
  customerProfileType.setEmail(props.email);
  customerProfileType.setPaymentProfiles(paymentProfilesList);

  var createRequest = new ApiContracts.CreateCustomerProfileRequest();
  createRequest.setProfile(customerProfileType);
  createRequest.setValidationMode(ApiContracts.ValidationModeEnum.TESTMODE);
  createRequest.setMerchantAuthentication(getMerchantAuth());

  var ctrl = new ApiControllers.CreateCustomerProfileController(
    createRequest.getJSON()
  );

  try {
    var response = await processRequest(ctrl);
    console.log(
      `Sucessfully created a customer profile with id: ${response.getCustomerProfileId()}`
    );
    return response.getCustomerProfileId();
  } catch (e) {
    throw e;
  }
};

const getCustomerProfile = async ({ customerId, paymentId }) => {
  var getRequest = new ApiContracts.GetCustomerPaymentProfileRequest();
  getRequest.setMerchantAuthentication(getMerchantAuth());
  getRequest.setCustomerProfileId(customerId);
  getRequest.setCustomerPaymentProfileId(paymentId);

  //pretty print request
  //console.log(JSON.stringify(createRequest.getJSON(), null, 2));
  var ctrl = new ApiControllers.GetCustomerProfileController(
    getRequest.getJSON()
  );
  var customer = {};
  try {
    var apiResponse = await executeRequest(ctrl);
    var response = new ApiContracts.GetCustomerPaymentProfileResponse(
      apiResponse
    );
    //pretty print response
    //console.log(JSON.stringify(response, null, 2));
    if (response != null) {
      if (
        response.getMessages().getResultCode() ==
        ApiContracts.MessageTypeEnum.OK
      ) {
        console.log("Customer", response.getPaymentProfile());
        customer.id = response
          .getPaymentProfile()
          .getCustomerPaymentProfileId();
        //        customer.firstName = response.getPaymentProfile().getBillTo().getFirstName();

        //				console.log('Customer Payment Profile ID : ' + response.getPaymentProfile().getCustomerPaymentProfileId());
        //				console.log('Customer Name : ' + response.getPaymentProfile().getBillTo().getFirstName() + ' ' +
        //					response.getPaymentProfile().getBillTo().getLastName());
        //				console.log('Address : ' + response.getPaymentProfile().getBillTo().getAddress());
      } else {
        var error = {};
        error.code = response
          .getMessages()
          .getMessage()[0]
          .getCode();
        error.description = response
          .getMessages()
          .getMessage()[0]
          .getText();
        throw new Error(error);
      }
    } else {
      throw new Error("Null response received");
    }
  } catch (e) {
    throw new Error(e);
  }

  return customer;
};

module.exports = { createCustomerProfile, getCustomerProfile };
