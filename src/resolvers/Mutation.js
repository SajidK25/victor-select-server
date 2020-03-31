const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const {
  sendResetMail,
  sendWelcomeMail,
  sendDeniedMail,
  sendShippedMail
} = require("../services/mail");
const { sendRefreshToken } = require("../sendRefreshToken");
const moment = require("moment");
const { makePayment } = require("../services/usaepay");
const {
  getCurrentCreditCard,
  updateAddress,
  updateCreditCard,
  getCurrentAddress,
  setPricing
} = require("./Helpers");
const {
  createRefreshToken,
  createAccessToken,
  validateUser
} = require("../auth");
const { validateAddress, createShipment } = require("../services/shippo");

const Mutation = {
  logout: async (_, __, { res }) => {
    sendRefreshToken(res, "");

    return true;
  },
  register: async (_, args, { prisma, res }) => {
    console.log("Entering register...");
    const { input } = args;
    input.email = input.email.toLowerCase();
    const user = await prisma.user({ email: input.email });
    console.log("Register User:", user);
    input.password = await bcrypt.hash(input.password, 10);
    let newUser;
    let message = "";
    if (user) {
      if (user.role !== "VISITOR") {
        return { message: "EXISTS", accessToken: "", user: null };
      } else {
        // Update information
        // copy the updates
        newUser = await prisma.updateUser({
          where: { email: input.email },
          data: { ...input }
        });
        message = "OK";
      }
    } else {
      newUser = await prisma.createUser({ ...input });
      message = "OK";
    }

    sendRefreshToken(res, createRefreshToken(newUser));

    return {
      message: message,
      accessToken: createAccessToken(newUser),
      user: newUser
    };
  },

  login: async (_, { email, password }, { res, prisma }) => {
    console.log("email:", email);

    // 1. Check for a user with that email address
    email = email.toLowerCase();
    const user = await prisma.user({ email });
    if (!user) {
      throw new Error("Invalid email or password.");
    }
    // 2. Check if password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    // Login successful
    sendRefreshToken(res, createRefreshToken(user));

    // Set the cookies with the token...
    return {
      accessToken: createAccessToken(user),
      user
    };
  },

  requestReset: async (_, args, { prisma }) => {
    // 1. Check if this is a real user
    const user = await prisma.user({ email: args.email });
    if (!user) {
      throw new Error(`No such user found for email ${args.email}`);
    }
    // 2. Set a reset token and expiry on that user
    const randomBytesPromiseified = promisify(randomBytes);
    const resetToken = (await randomBytesPromiseified(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    const updateUser = await prisma.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    });
    console.log("UpdateUser:", updateUser);
    // 3. Email them that reset token
    const url = `${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}`;
    sendResetMail({ email: args.email, name: updateUser.firstName, url });

    // 4. Return the message
    return { message: "Thanks!" };
  },

  resetPassword: async (_, args, { prisma }) => {
    // 1. check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Yo Passwords don't match!");
    }
    // 2. check if its a legit reset token
    // 3. Check if its expired
    const [user] = await prisma.users({
      where: {
        AND: [
          { resetToken: args.resetToken },
          { resetTokenExpiry_gte: Date.now() - 3600000 }
        ]
      }
    });
    if (!user) {
      throw new Error("This token is either invalid or expired!");
    }
    // 4. Hash their new password
    const password = await bcrypt.hash(args.password, 10);
    // 5. Save the new password to the user and remove old resetToken fields
    const updatedUser = await prisma.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    // 6. Generate JWT
    // Set the cookies with the token...
    setUser(updatedUser, ctx);
    // 8. return the new user
    return updatedUser;
  },

  revokeRefreshTokensForUser: async (_, args, { req, prisma }) => {
    const user = await prisma.user({ id: args.userId });
    if (!user) {
      return false;
    }
    const count = user.count + 1;
    await prisma.updateUser({
      data: { count },
      where: { id: args.userId }
    });

    return true;
  },

  saveCard: async (_, args, { req, prisma }) => {
    const payload = await validateUser(req);
    const { userId } = payload;

    const { input } = args;

    const savedCard = await saveCreditCard(input);
    if (savedCard) {
      // Update all current user credit cards to inactive
      await prisma.updateManyCreditCards({
        where: { user: { id: userId }, active: true },
        data: { active: false }
      });
      // Save new active card
      const newCC = await prisma.createCreditCard({
        ccType: savedCard.type,
        ccToken: savedCard.key,
        ccNumber: savedCard.cardnumber,
        ccExpire: input.expiration,
        active: true,
        user: {
          connect: {
            id: userId
          }
        }
      });

      console.log("NewCC", newCC);
      return newCC;
    } else {
      throw new Error("Unable to process credit card");
    }
  },

  //  async makePayment(_, { input }, { req, prisma }) {
  //    await validateUser(req.userId, prisma);
  //  },
  async newMessage(_, { input }, { req, prisma }) {
    const payload = await validateUser(req);
    const { userId, userRole } = payload;

    const prescriptionUser = await prisma
      .visit({ id: input.prescriptionId })
      .user();
    if (!prescriptionUser) {
      throw new Error("Unable to find prescription record");
    }
    console.log("Visit User:", visitUser);

    const msgInput = {
      prescription: {
        connect: {
          id: input.prescriptionId
        }
      },
      text: input.text,
      user: {
        connect: {
          id: prescriptionUser.id
        }
      },
      private: input.private
    };

    if (userRole === "PHYSICIAN") {
      msgInput.physician = {
        connect: {
          id: userId
        }
      };
    }

    await prisma.createMessage({
      ...msgInput
    });

    return { message: "OK" };
  },

  saveAddress: async (_, { input }, { req, prisma }) => {
    const payload = await validateUser(req);
    const { userId } = payload;

    const user = await prisma.user({ id: userId });

    const address = await updateAddress(user, input, prisma);

    return address;
  },

  updateCurrVisit: async (_, args, { req, prisma }) => {
    const payload = await validateUser(req);
    if (!payload) return { message: "ERROR" };

    const { input } = args;
    delete input.payment;
    await prisma.updateUser({
      data: { currVisit: input },
      where: { id: payload.userId }
    });
    return { message: "OK" };
  },

  updateVisit: async (_, { id, status = "APPROVED" }, { prisma }) => {
    await prisma.updateVisit({
      data: {
        status: status
      },
      where: { id: id }
    });
    return { message: "OK" };
  },

  updatePrescription: async (_, { id, status = "NEW" }, { prisma }) => {
    await prisma.updatePrescription({
      data: {
        status: status
      },
      where: { id: id }
    });
    return { message: "OK" };
  },

  makePayment: async (_, args, { req, prisma }) => {
    const { token, amount } = args;
    console.log(token, amount);

    const result = await makePayment({
      ccToken: token,
      amount: amount,
      email: "bakerman59@gmail.com",
      cardholder: "Brian Baker"
    });

    return result;
  },

  denyPrescription: async (_, { id }, { req, prisma }) => {
    const payload = await validateUser(req, true);
    await prisma.updatePrescription({
      data: {
        status: "DENIED",
        approvedDate: moment().format()
      },
      where: { id: id }
    });
    const user = await prisma.prescription({ id: id }).user();
    // send denied email
    sendDeniedMail({ email: user.email, name: user.firstName });
    return { message: "OK" };
  },

  approvePrescription: async (_, args, { req, prisma }) => {
    const payload = await validateUser(req, true);
    const physicianId = payload.userId;

    const { id } = args;

    // Get Prescription
    const prescription = await prisma.prescription({ id: id });
    const user = await prisma.prescription({ id: id }).user();
    const creditcard = await getCurrentCreditCard(user.id, prisma);
    const address = await getCurrentAddress(user.id, prisma);
    console.log("Token=", creditcard);
    console.log("Prescription:", prescription);

    var paymentResult = {};
    try {
      paymentResult = await makePayment({
        ccToken: creditcard.ccToken,
        amount: prescription.amountDue,
        cardholder: user.firstName + " " + user.lastName,
        email: user.email
      });
    } catch (err) {
      paymentResult = { resultCode: "D", refnum: "" };
      console.log(err);
    }
    // Make payment...

    // Create Order
    const order = await prisma.createOrder({
      amount: prescription.amountDue,
      refnum: paymentResult.refnum,
      status: paymentResult.resultCode === "A" ? "PENDING" : "PAYMENT_DECLINED",
      new: true,
      refills: prescription.shippingInterval - 1,
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      creditCard: { connect: { id: creditcard.id } },
      addressOne: address.addressOne,
      addressTwo: address.addressTwo,
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      shippoAddressId: address.shippoId
    });

    const refillsRemaining =
      prescription.refillsRemaining - prescription.shippingInterval;
    const approvedDate = moment();
    const expireDate = moment(approvedDate)
      .add(1, "year")
      .format();
    console.log("ExpireDate", expireDate);

    console.log("Order:", order);
    await prisma.updatePrescription({
      data: {
        refillsRemaining: refillsRemaining,
        status: "ACTIVE",
        approvedDate: approvedDate.format(),
        startDate: approvedDate.format(),
        expireDate: expireDate
      },
      where: { id: id }
    });

    // Create message
    const message = await prisma.createMessage({
      private: false,
      read: false,
      physician: { connect: { id: physicianId } },
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      text: "New patient message!"
    });
    console.log("Message", message);

    // Send approved email...
    // Send new private message email...

    return { message: "OK" };
  },

  saveNewVisit: async (_, args, { req, prisma }) => {
    console.log("Save New Visit!");
    const payload = await validateUser(req);

    const { userId } = payload;
    console.log("Payload", payload);
    console.log("UserId", userId);

    const user = await prisma.user({ id: userId });

    const { input } = args;

    // first validate and save credit card
    const cardInput = {
      cardNumber: input.payment.cardNumber,
      cardExpiry: input.payment.cardExpiry,
      cardCVC: input.payment.cardCVC,
      firstName: user.firstName,
      lastName: user.lastName,
      zipCode: input.personal.zipCode,
      address: input.personal.addressOne
    };

    const newCC = await updateCreditCard(userId, cardInput, prisma);
    console.log("NewCC", newCC);

    // Next add address
    addressInput = {
      addressOne: input.personal.addressOne,
      addressTwo: input.personal.addressTwo,
      city: input.personal.city,
      state: input.personal.state,
      zipcode: input.personal.zipCode,
      telephone: input.personal.telephone,
      email: input.personal.email
    };

    const address = await updateAddress(user, addressInput, prisma);
    console.log("Address", address);

    // Save new visit
    const birthDate = new Date(input.personal.birthDate);
    console.log("BirthDate", birthDate);
    const gender = input.personal.gender;
    const photoId = input.personal.licenseImage;

    // Save Prescription Information

    const pInput = {};
    const s = input.subscription;
    if (s.addOnId === "NO_ADDON") s.addOnId = "";
    const pricing = await setPricing(s, prisma);

    pInput.type = input.type;
    pInput.timesPerMonth = parseInt(s.dosesPerMonth);
    const productId = s.drugId + s.doseOption;
    const addonId = s.addOnId;
    pInput.addonTimesPerMonth = s.addOnId ? 30 : 0;
    pInput.totalRefills = 12;
    pInput.refillsRemaining = 12;
    pInput.shippingInterval = pricing.shippingInterval;
    pInput.amountDue = pricing.amountDue;

    // Isolate the questionnaire
    const questionaire = input;
    delete questionaire.page;
    delete questionaire.personal;
    delete questionaire.payment;
    delete questionaire.subscription;

    const visit = await prisma.createVisit({
      type: input.type,
      questionnaire: questionaire,
      user: {
        connect: {
          id: userId
        }
      }
    });
    console.log("Visit", visit);

    // Create Prescription
    const prescription = await prisma.createPrescription({
      ...pInput,
      user: { connect: { id: userId } },
      visit: { connect: { id: visit.id } },
      product: { connect: { productId: productId } },
      addon: addonId ? { connect: { productId: addonId } } : {}
    });
    console.log("Prescription:", prescription);

    // const userRole = user.role === "VISITOR" ? "PATIENT" : user.role;
    // Update user
    const updateUser = await prisma.updateUser({
      data: {
        currVisit: null,
        //        role: userRole,
        gender: gender,
        birthDate: birthDate,
        photoId: photoId
      },
      where: { id: userId }
    });
    sendWelcomeMail({ email: updateUser.email, name: updateUser.firstName });

    return { message: "OK" };
  },

  processOrders: async (_, { idList }, { req, prisma }) => {
    const payload = await validateUser(req, true);

    console.log("idList: ", idList);

    idList.forEach(async i => {
      console.log("id", i);
      await prisma.updateOrder({
        data: {
          status: "PROCESSING"
        },
        where: { id: i }
      });
    });

    return { message: "OK" };
  },

  shipOrders: async (_, { idList }, { req, prisma }) => {
    const payload = await validateUser(req, true);

    console.log("idList: ", idList);
    let user = null;
    // Create Shippo Batch and process it
    // Update orders to shipped

    var shipments = [];
    let order = null;
    // Create Shipments
    idList.forEach(async i => {
      console.log("id", i);

      order = await prisma.order({ id: i });
      console.log("AddressId", order.shippoAddressId);
      shipmentId = await createShipment(order.shippoAddressId);
      shipments.push({ orderId: i, shipmentId: shipmentId });
      //      await createShipment()
      //      await prisma.updateOrder({
      //        data: {
      //          status: "SHIPPED",
      //          shipDate: moment().format(),
      //          trackingNumber: "TRACKING_NUMBER"
      //        },
      //        where: { id: i }
      //      });

      //     user = await prisma.order({ id: i }).user();
      //      console.log("User: ", user);
      //      if (user) await sendShippedMail({ email: user.email });
    });
    console.log(shipments);
    //
    // const batch = createBatch(shipments);
    // for each

    return { message: "OK" };
  },

  validateAddresses: async (_, __, { prisma }) => {
    const addresses = await prisma.addresses();
    let user = null;
    let input = null;
    let updateRet = null;
    addresses.forEach(async address => {
      console.log(address);
      if (!address.shippoId || !address.email) {
        user = await prisma.address({ id: address.id }).user();
        input = {
          city: address.city,
          zipcode: address.zipcode,
          email: user.email,
          state: address.state,
          addressOne: address.addressOne,
          telephone: address.telephone,
          addressTwo: ""
        };
        updateRet = await updateAddress(user, input, prisma);
        console.log(updateRet);
      }
    });

    return { message: "OK" };
  },

  validateUserAddress: async (_, __, { req, prisma }) => {
    const input = {
      name: "Brian Baker",
      addressOne: "352 Ambroise",
      addressTwo: "",
      city: "Newport Coast",
      state: "CA",
      zipcode: "92657",
      phoneNumber: "9494138239",
      email: "brianbbaker.net"
    };

    const ret = await validateAddress(input);
    console.log("Address", ret);

    return { message: "OK" };
  }
};

module.exports = { Mutation };

//  createVisit(
//    questionaire: Json!
//    addressOne: String!
//    addressTwo: String
//    city: String!
//    state: String!
//    zipcode: String!
//    telephone: String!
