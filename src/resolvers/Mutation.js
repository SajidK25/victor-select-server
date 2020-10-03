const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const {
  sendResetMail,
  sendWelcomeMail,
  sendDeniedMail,
  sendShippedMail,
  sendComingSoonMail,
  sendPrivateMessageMail,
  sendActivityCopy,
  sendCheckinMail,
} = require("../services/mail");
const { sendRefreshToken } = require("../sendRefreshToken");
const moment = require("moment");
const { makePayment, saveCreditCard } = require("../services/usaepay");
const { asyncForEach } = require("../utils");
const {
  getCurrentCreditCard,
  updateAddress,
  updateCreditCard,
  getCurrentAddress,
  setPricing,
  setSupplementPricing,
  obscureAddress,
  formatMoney,
  convertInterval,
} = require("./Helpers");
const { createRefreshToken, createAccessToken, validateUser } = require("../auth");
const { validateZipcode } = require("../helpers/validateZipcode");
const { validateAddress, createShippoOrder, createBatch, createParcel } = require("../services/shippo");
const { sendTextMessage } = require("../services/twilio");
const addMonths = require("date-fns/addMonths");
const format = require("date-fns/format");
const startOfToday = require("date-fns/startOfToday");
const endOfDay = require("date-fns/endOfDay");
const addDays = require("date-fns/addDays");
const addWeeks = require("date-fns/addWeeks");

const Mutation = {
  logout: async (_, __, { res }) => {
    sendRefreshToken(res, "");

    return true;
  },
  register: async (_, args, { prisma, res }) => {
    const { input } = args;
    input.email = input.email.toLowerCase();
    const user = await prisma.user({ email: input.email });
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
          data: { ...input },
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
      user: newUser,
    };
  },

  updateEmail: async (_, { newEmail, password }, { req, prisma }) => {
    const { userId } = await validateUser(req);

    const email = newEmail.toLowerCase();
    const testUser = await prisma.user({ email });
    if (testUser) {
      return { message: "THAT EMAIL ADDRESS IS IN USE" };
    }

    const user = await prisma.user({ id: userId });
    if (!user) {
      return { message: "ERROR ACCESSING RECORD, TRY AGAIN LATER" };
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { message: "INCORRECT PASSWORD" };
    }

    await prisma.updateUser({
      where: { id: userId },
      data: {
        email,
      },
    });

    return { message: "OK" };
  },

  updatePassword: async (_, { currentPassword, newPassword }, { req, prisma }) => {
    const { userId } = await validateUser(req);

    const user = await prisma.user({ id: userId });
    if (!user) {
      return { message: "ERROR ACCESSING RECORD, TRY AGAIN LATER" };
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return { message: "INCORRECT PASSWORD" };
    }
    newPassword = await bcrypt.hash(newPassword, 10);
    await prisma.updateUser({
      where: { id: userId },
      data: {
        password: newPassword,
      },
    });
    return { message: "OK" };
  },

  login: async (_, { email, password }, { res, prisma }) => {
    // 1. Check for a user with that email address
    email = email.toLowerCase();
    const user = await prisma.user({ email });
    if (!user) {
      throw new Error("Invalid email or password.");
    }
    // 2. Check if password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid email or password.");
      console.log("error");
    }

    //   if (user.role === "VISITOR") {
    //     throw new Error("Invalid email or password.");
    //   }

    // Login successful
    sendRefreshToken(res, createRefreshToken(user));

    // Set the cookies with the token...
    return {
      message: "OK",
      accessToken: createAccessToken(user),
      user,
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
      data: { resetToken, resetTokenExpiry },
    });
    // 3. Email them that reset token
    const url = `${process.env.FRONTEND_URL}/reset/${resetToken}`;
    sendResetMail({ email: args.email, name: updateUser.firstName, url });

    // 4. Return the message
    return { message: "OK" };
  },

  resetPassword: async (_, args, { prisma }) => {
    // 1. check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Your passwords don't match!");
    }
    // 2. check if its a legit reset token
    // 3. Check if its expired
    const [user] = await prisma.users({
      where: {
        AND: [{ resetToken: args.resetToken }, { resetTokenExpiry_gte: Date.now() - 3600000 }],
      },
    });
    if (!user) {
      throw new Error("Your reset code is either invalid or expired.");
    }
    // 4. Hash their new password
    const password = await bcrypt.hash(args.password, 10);
    // 5. Save the new password to the user and remove old resetToken fields
    await prisma.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: "OK" };
    // 6. Generate JWT
    // sendRefreshToken(res, createRefreshToken(user));

    // Set the cookies with the token...
    // return {
    //   accessToken: createAccessToken(user),
    //   user,
    // }; // Set the cookies with the token...
  },

  revokeRefreshTokensForUser: async (_, args, { req, prisma }) => {
    const user = await prisma.user({ id: args.userId });
    if (!user) {
      return false;
    }
    const count = user.count + 1;
    await prisma.updateUser({
      data: { count },
      where: { id: args.userId },
    });

    return true;
  },

  saveCard: async (_, args, { req, prisma }) => {
    const { userId } = await validateUser(req);
    const user = await prisma.user({ id: userId });
    const address = await getCurrentAddress(userId, prisma);
    const { input } = args;

    const cardInput = {
      cardNumber: input.cardNumber,
      cardExpiry: input.expiration,
      cardCVC: input.cardCVC,
      firstName: user.firstName,
      lastName: user.lastName,
      address: address.addressOne,
      zipcode: address.zipcode,
    };

    const newCC = await updateCreditCard(userId, cardInput, prisma, false);

    if (newCC) {
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

    const prescriptionUser = await prisma.prescription({ id: input.prescriptionId }).user();
    if (!prescriptionUser) {
      throw new Error("Unable to find prescription record");
    }

    const msgInput = {
      prescription: {
        connect: {
          id: input.prescriptionId,
        },
      },
      text: input.text,
      fromPatient: userRole === "PATIENT" || userRole === "VISITOR",
      user: {
        connect: {
          id: prescriptionUser.id,
        },
      },
      private: input.private,
    };

    if (userRole === "PHYSICIAN") {
      msgInput.physician = {
        connect: {
          id: userId,
        },
      };
    }

    await prisma.createMessage({
      ...msgInput,
    });

    if (userRole === "PHYSICIAN") {
      if (prescriptionUser) {
        sendPrivateMessageMail({ email: prescriptionUser.email, name: prescriptionUser.firstName });
      }
    } else {
      sendActivityCopy({
        email: "brian@bbaker.net",
        text: `Secure message sent from ${prescriptionUser.email}.`,
      });
    }

    return { message: "OK" };
  },

  saveAddress: async (_, { input }, { req, prisma }) => {
    const payload = await validateUser(req);
    const { userId } = payload;
    const user = await prisma.user({ id: userId });

    // No zipcode restrictions for supplements
    if (input.checkZipcode && !validateZipcode(input.zipCode)) {
      return { message: "INVALID_ZIPCODE" };
    }

    const address = await updateAddress({
      user: user,
      newAddress: input,
      prisma: prisma,
    });

    if (!address) return { message: "NOT_SAVED" };

    return { message: "OK" };
  },

  updateCurrVisit: async (_, args, { req, prisma }) => {
    const payload = await validateUser(req);
    if (!payload) return { message: "ERROR" };

    const { input } = args;
    delete input.payment;
    await prisma.updateUser({
      data: { currVisit: input },
      where: { id: payload.userId },
    });
    return { message: "OK" };
  },

  updateVisit: async (_, { id, status = "APPROVED" }, { prisma }) => {
    await prisma.updateVisit({
      data: {
        status: status,
      },
      where: { id: id },
    });
    return { message: "OK" };
  },

  updatePrescription: async (_, { id, status = "NEW" }, { prisma }) => {
    await prisma.updatePrescription({
      data: {
        status: status,
      },
      where: { id: id },
    });
    return { message: "OK" };
  },

  makePayment: async (_, args, { req, prisma }) => {
    const { token, amount } = args;

    const result = await makePayment({
      ccToken: token,
      amount: amount,
      email: "bakerman59@gmail.com",
      cardholder: "Brian Baker",
    });

    return result;
  },

  denyPrescription: async (_, { id }, { req, prisma }) => {
    const payload = await validateUser(req, true);
    await prisma.updatePrescription({
      data: {
        status: "DENIED",
        approvedDate: moment().format(),
      },
      where: { id: id },
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

    let amountDue = prescription.amountDue;
    if (prescription.amountFirstDue) {
      amountDue = prescription.amountFirstDue;
    }

    var paymentResult = {};
    try {
      paymentResult = await makePayment({
        ccToken: creditcard.ccToken,
        amount: amountDue,
        cardholder: user.firstName + " " + user.lastName,
        email: user.email,
        street: address.addressOne,
        zipcode: address.zipcode,
      });
    } catch (err) {
      paymentResult = { resultCode: "D", refnum: "" };
      console.log(err);
    }
    // Make payment...

    // Create Order
    const order = await prisma.createOrder({
      amount: amountDue,
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
      telephone: address.telephone,
      email: address.email,
      shippoAddressId: address.shippoId,
    });

    const refillsRemaining = prescription.refillsRemaining - prescription.shippingInterval;
    const approvedDate = moment();
    const expireDate = moment(approvedDate)
      .add(1, "year")
      .format();

    await prisma.updatePrescription({
      data: {
        refillsRemaining: refillsRemaining,
        status: "ACTIVE",
        approvedDate: approvedDate.format(),
        startDate: approvedDate.format(),
        expireDate: expireDate,
      },
      where: { id: id },
    });

    // Create message
    const message = await prisma.createMessage({
      private: false,
      read: false,
      fromPatient: false,
      physician: { connect: { id: physicianId } },
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      text: `[${prescription.type}_WELCOME]`,
    });

    sendPrivateMessageMail({ email: user.email, name: user.firstName });

    return { message: "OK" };
  },

  saveNewVisit: async (_, args, { req, prisma }) => {
    const payload = await validateUser(req);

    const { userId } = payload;

    const user = await prisma.user({ id: userId });

    const { input } = args;

    sendTextMessage(`New ${input.type} visit save started for ${user.email}`, "9494138239");
    sendActivityCopy({
      email: "brian@bbaker.net",
      text: `New ${input.type} visit saved for ${user.email}.`,
    });

    // First validate and add address
    addressInput = {
      addressOne: input.personal.addressOne,
      addressTwo: input.personal.addressTwo,
      city: input.personal.city,
      state: input.personal.state,
      zipcode: input.personal.zipCode,
      telephone: input.personal.telephone,
      email: user.email,
    };

    const address = await updateAddress({
      user: user,
      newAddress: addressInput,
      prisma: prisma,
    });

    // next validate and save credit card
    const cardInput = {
      cardNumber: input.payment.cardNumber,
      cardExpiry: input.payment.cardExpiry,
      cardCVC: input.payment.cardCVC,
      firstName: user.firstName,
      lastName: user.lastName,
      zipCode: input.personal.zipCode,
      address: input.personal.addressOne,
    };

    const newCC = await updateCreditCard(userId, cardInput, prisma);
    if (!newCC) {
      sendTextMessage(`Unable to process credit card for saved for ${user.email}`, "9494138239");
      return { message: "CANT_SAVE_CARD" };
    }

    // Save new visit
    const birthDate = new Date(input.personal.birthDate);
    const gender = input.personal.gender;
    const photoId = input.personal.licenseImage;

    // Save Prescription Information

    const pInput = {};
    const s = input.subscription;
    if (s.addOnId === "NO_ADDON") s.addOnId = "";
    const pricing = await setPricing(s, prisma);

    pInput.type = input.type;
    pInput.timesPerMonth = !s.dosesPerMonth ? 1 : parseInt(s.dosesPerMonth);
    const productId = s.drugId + s.doseOption;
    const addonId = s.addOnId;
    pInput.addonTimesPerMonth = s.addOnId ? 30 : 0;
    pInput.totalRefills = 12;
    pInput.refillsRemaining = 12;
    pInput.shippingInterval = pricing.shippingInterval;
    pInput.amountDue = pricing.amountDue;
    let discountAmount = s.discountAmount * 100;
    if (discountAmount === 0) {
      discountAmount = pricing.amountDue * s.discountPercent;
    }
    pInput.amountFirstDue = pricing.amountDue - discountAmount;
    pInput.discountCode = discountAmount > 0 ? s.discountCode : "";

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
          id: userId,
        },
      },
    });

    console.log("Input", pInput);
    // Create Prescription
    const prescription = await prisma.createPrescription({
      ...pInput,
      user: { connect: { id: userId } },
      visit: { connect: { id: visit.id } },
      product: { connect: { productId: productId } },
      addon: addonId ? { connect: { productId: addonId } } : {},
    });
    // const userRole = user.role === "VISITOR" ? "PATIENT" : user.role;
    // Update user
    const updateUser = await prisma.updateUser({
      data: {
        currVisit: null,
        //        role: userRole,
        gender: gender,
        birthDate: birthDate,
        photoId: photoId,
      },
      where: { id: userId },
    });
    sendWelcomeMail({ email: updateUser.email, name: updateUser.firstName });
    sendTextMessage(
      `A new ${prescription.type} visit has been saved.\nhttps://physician-select.herokuapp.com/`,
      process.env.DOC_NOTIFY_NUMBER
    );

    return { message: "OK" };
  },

  processOrders: async (_, { idList }, { req, prisma }) => {
    await validateUser(req, true);

    await asyncForEach(idList, async (id) => {
      //      let order = await prisma.order({ id: id });
      //      let orderId = await createShippoOrder(order);
      await prisma.updateOrder({
        data: {
          status: "PROCESSING",
          //          shippoShipmentId: orderId,
        },
        where: { id: id },
      });
    });

    return { message: "OK" };
  },

  saveNewSupplement: async (_, args, { req, prisma }) => {
    const payload = await validateUser(req);

    const { userId } = payload;
    const user = await prisma.user({ id: userId });

    const { input } = args;

    sendActivityCopy({
      email: "brian@bbaker.net",
      text: `New supplement: ${input.subscription.drugId} saved for ${user.email}`,
    });

    // first validate and save credit card
    let newCC = null;
    if (input.control.savedCreditCard) {
      newCC = await getCurrentCreditCard(user.id, prisma);
    } else {
      const cardInput = {
        cardNumber: input.payment.cardNumber,
        cardExpiry: input.payment.cardExpiry,
        cardCVC: input.payment.cardCVC,
        firstName: user.firstName,
        lastName: user.lastName,
        zipCode: input.personal.zipCode,
        address: input.personal.addressOne,
      };
      newCC = await updateCreditCard(userId, cardInput, prisma, true);
    }

    if (!newCC) {
      sendActivityCopy({
        email: "brian@bbaker.net",
        text: `Unable to process credit card for saved for ${user.email}`,
      });
      return { message: "CANT_SAVE_CARD" };
    }
    // Save Prescription Information
    const pInput = {};
    const s = input.subscription;
    const pricing = await setSupplementPricing(s, prisma);

    pInput.type = input.type;
    pInput.status = "ACTIVE";
    pInput.timesPerMonth = 1;
    const productId = s.drugId;
    pInput.addonTimesPerMonth = 0;
    pInput.totalRefills = 999;
    pInput.refillsRemaining = 999;
    pInput.shippingInterval = pricing.shippingInterval;
    pInput.amountDue = pricing.amountDue;

    const visit = await prisma.createVisit({
      type: input.type,
      questionnaire: {},
      user: {
        connect: {
          id: userId,
        },
      },
    });

    // Create Prescription
    const prescription = await prisma.createPrescription({
      ...pInput,
      user: { connect: { id: userId } },
      visit: { connect: { id: visit.id } },
      product: { connect: { productId: productId } },
      addon: {},
    });
    // const userRole = user.role === "VISITOR" ? "PATIENT" : user.role;
    // Update user
    //   sendWelcomeMail({ email: updateUser.email, name: updateUser.firstName });
    var paymentResult = {};
    try {
      paymentResult = await makePayment({
        ccToken: newCC.ccToken,
        amount: prescription.amountDue,
        cardholder: user.firstName + " " + user.lastName,
        email: user.email,
        zipcode: input.personal.zipCode,
        address: input.personal.addressOne,
      });
    } catch (err) {
      paymentResult = { resultCode: "D", refnum: "" };
      console.log(err);
    }

    const address = await getCurrentAddress(user.id, prisma);
    // Make payment...
    const order = await prisma.createOrder({
      amount: prescription.amountDue,
      refnum: paymentResult.refnum,
      status: paymentResult.resultCode === "A" ? "PENDING" : "PAYMENT_DECLINED",
      new: true,
      refills: 999,
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      creditCard: { connect: { id: newCC.id } },
      addressOne: address.addressOne,
      addressTwo: address.addressTwo,
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      shippoAddressId: address.shippoId,
    });

    if (paymentResult.resultCode !== "A") {
      return { message: "PAYMENT_DECLINED" };
    }
    return { message: "OK" };
  },
  /*  processOrder: async (_, {id}, {req, prisma }) => {
    const {userId} = await validateUser(req, true);

    // Get Prescription
    const prescription = await prisma.prescription({ id: id });
    const user = await prisma.prescription({ id: id }).user();
    const creditcard = await getCurrentCreditCard(user.id, prisma);
    const address = await getCurrentAddress(user.id, prisma);

    let amountDue = prescription.amountDue;
    
    var paymentResult = {};
    try {
      paymentResult = await makePayment({
        ccToken: creditcard.ccToken,
        amount: amountDue,
        cardholder: user.firstName + " " + user.lastName,
        email: user.email,
        street: address.addressOne,
        zipcode: address.zipcode,
      });
    } catch (err) {
      paymentResult = { resultCode: "D", refnum: "" };
      console.log(err);
    }

    if (paymentResult.resultCode !== "A") {
      return {message: "PAYMENT_DECLINED"};
    }

    // Create Order
    const order = await prisma.createOrder({
      amount: amountDue,
      refnum: paymentResult.refnum,
      status: "PENDING",
      new: false,
      refills: prescription.shippingInterval,
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      creditCard: { connect: { id: creditcard.id } },
      addressOne: address.addressOne,
      addressTwo: address.addressTwo,
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      telephone: address.telephone,
      email: address.email,
      shippoAddressId: address.shippoId,
    });

    const refillsRemaining = prescription.refillsRemaining - prescription.shippingInterval;
    const nextDelivery = addMonths(newDate(prescription.nextDelivery))

    await prisma.updatePrescription({
      data: {
        refillsRemaining: refillsRemaining,
        status: "ACTIVE",
        approvedDate: approvedDate.format(),
        startDate: approvedDate.format(),
        expireDate: expireDate,
      },
      where: { id: id },
    });

    // Create message
    const message = await prisma.createMessage({
      private: false,
      read: false,
      fromPatient: false,
      physician: { connect: { id: physicianId } },
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      text: `[${prescription.type}_WELCOME]`,
    });

    sendPrivateMessageMail({ email: user.email, name: user.firstName });

    return { message: "OK" };const payload = await validateUser(req, true);
    const physicianId = payload.userId;

    const { id } = args;

    // Get Prescription
    const prescription = await prisma.prescription({ id: id });
    const user = await prisma.prescription({ id: id }).user();
    const creditcard = await getCurrentCreditCard(user.id, prisma);
    const address = await getCurrentAddress(user.id, prisma);

    let amountDue = prescription.amountDue;
    if (prescription.amountFirstDue) {
      amountDue = prescription.amountFirstDue;
    }

    var paymentResult = {};
    try {
      paymentResult = await makePayment({
        ccToken: creditcard.ccToken,
        amount: amountDue,
        cardholder: user.firstName + " " + user.lastName,
        email: user.email,
        street: address.addressOne,
        zipcode: address.zipcode,
      });
    } catch (err) {
      paymentResult = { resultCode: "D", refnum: "" };
      console.log(err);
    }
    // Make payment...

    // Create Order
    const order = await prisma.createOrder({
      amount: amountDue,
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
      telephone: address.telephone,
      email: address.email,
      shippoAddressId: address.shippoId,
    });

    const refillsRemaining = prescription.refillsRemaining - prescription.shippingInterval;
    const approvedDate = moment();
    const expireDate = moment(approvedDate)
      .add(1, "year")
      .format();

    await prisma.updatePrescription({
      data: {
        refillsRemaining: refillsRemaining,
        status: "ACTIVE",
        approvedDate: approvedDate.format(),
        startDate: approvedDate.format(),
        expireDate: expireDate,
      },
      where: { id: id },
    });

    // Create message
    const message = await prisma.createMessage({
      private: false,
      read: false,
      fromPatient: false,
      physician: { connect: { id: physicianId } },
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      text: `[${prescription.type}_WELCOME]`,
    });

    sendPrivateMessageMail({ email: user.email, name: user.firstName });

    return { message: "OK" };


  },
  */
  processPlans: async (_, __, { req, prisma }) => {
    await vailidateUser(req, true);

    const prescriptions = await prisma.prescriptions({
      where: {
        AND: [{ status: "ACTIVE" }, { nextDelivery: moment().format() }],
      },
    });

    if (prescriptions) {
      await asyncForEach(prescriptions, async (prescription) => {
        // Write new order
        // Charge Credit Card
        // Update Prescription
      });
      // Send update email...
    }
  },

  setNextDeliveryDate: async (_, __, { req, prisma }) => {
    //    await vailidateUser(req, true);

    const prescriptions = await prisma.prescriptions({
      where: {
        status: "ACTIVE",
      },
    });

    if (prescriptions) {
      await asyncForEach(prescriptions, async (prescription) => {
        //       if (!prescription.nextDelivery) {
        if (prescription.startDate) {
          const nextDelivery = addMonths(new Date(prescription.startDate), prescription.shippingInterval);
          console.log("Update next", format(new Date(nextDelivery), "MMMM do"));
          await prisma.updatePrescription({
            data: {
              nextDelivery: nextDelivery,
            },
            where: { id: prescription.id },
          });
        }
        //        }
        // Write new order
        // Charge Credit Card
        // Update Prescription
      });

      // Send update email...
    }
    return { message: "OK" };
  },
  updateNextDeliveryDate: async (_, { id, updateType }, { req, prisma }) => {
    const prescription = await prisma.prescription({ id: id });
    const user = await prisma.prescription({ id: prescription.id }).user();
    if (!prescription) {
      throw new Error("Unable to read the prescription ID");
    }

    if (updateType < 0 || updateType > 3) {
      throw new Error("Wrong update type value sent");
    }

    var newNextDelivery = new Date(prescription.nextDelivery);
    var newInterval = prescription.shippingInterval;
    var messageText = "";
    if (updateType === 1) {
      // Push out a month
      newNextDelivery = addMonths(newNextDelivery, 1);
      messageText = `Delivery date delayed one month by user to ${format(newNextDelivery, "MMM do, yyyy")}`;
    }
    if (updateType === 2) {
      // Push out two weeks
      newNextDelivery = addWeeks(newNextDelivery, 2);
      messageText = `Delivery date delayed two weeks by user to ${format(newNextDelivery, "MMM do, yyyy")}`;
    }
    if (updateType == 3) {
      // going to onDemand
      newNextDelivery = new Date(prescription.expireDate);
      newInterval = 0;
      messageText = "Auto-delivery was canceled by user.";
    }
    console.log("Next Delivery", newNextDelivery);
    await prisma.updatePrescription({
      data: {
        nextDelivery: newNextDelivery,
        reminderSent: false,
        shippingInterval: newInterval,
      },
      where: { id: prescription.id },
    });

    await prisma.createMessage({
      private: true,
      read: false,
      fromPatient: true,
      user: { connect: { id: user.id } },
      prescription: { connect: { id: prescription.id } },
      text: messageText,
    });

    return { message: "OK" };
  },
  sendReminders: async (_, __, { req, prisma }) => {
    const checkDate = addDays(startOfToday(), 2);
    const endDate = endOfDay(checkDate);

    const prescriptions = await prisma.prescriptions({
      where: {
        status: "ACTIVE",
        reminderSent: false,
        nextDelivery_gte: checkDate.toISOString(),
        nextDelivery_lte: endDate.toISOString(),
      },
    });

    let count = 0;
    if (prescriptions) {
      await asyncForEach(prescriptions, async (prescription) => {
        const user = await prisma.prescription({ id: prescription.id }).user();
        const address = await getCurrentAddress(user.id, prisma);
        const obscured = obscureAddress(address);
        const creditCard = await getCurrentCreditCard(user.id, prisma);
        await sendCheckinMail({
          email: user.email,
          input: {
            name: user.firstName,
            address_1: obscured.address_1,
            address_2: obscured.address_2,
            creditcard_1: creditCard.ccNumber,
            creditcard_2: creditCard.ccExpire,
            amount: formatMoney(prescription.amountDue / 100, 2),
            interval: convertInterval(prescription.shippingInterval),
          },
        });
        await prisma.updatePrescription({
          data: {
            reminderSent: true,
          },
          where: { id: prescription.id },
        });
        count++;
      });
    }
    return count;
  },

  resetShippoIds: async (_, __, { req, prisma }) => {
    //   await validateUser(req, true);
    const users = await prisma.users();

    if (users) {
      await asyncForEach(users, async (user) => {
        await updateAddress({ user: user, prisma: prisma });
      });
    }

    const orders = await prisma.orders();
    var user;
    var address;

    if (orders) {
      await asyncForEach(
        orders,
        async (order) => {
          //     if (!order.addressOne) {
          user = await prisma.order({ id: order.id }).user();
          address = await getCurrentAddress(user.id, prisma);
          await prisma.updateOrder({
            data: {
              addressOne: address.addressOne,
              addressTwo: address.addressTwo,
              city: address.city,
              state: address.state,
              zipcode: address.zipcode,
              shippoAddressId: address.shippoId,
            },
            where: { id: order.id },
          });
        }
        //  }
      );
    }

    return { message: "OK" };
  },

  prepareShipment: async (_, { idList }, { req, prisma }) => {
    //   await validateUser(req, true);
    console.log("Starting process...");

    const fragment = `
    fragment OrderWithPrescription on Order {
      id
      shippoAddressId
      prescription {
        product {
          productId
        }
        addon {
          productId
        }
        shippingInterval
      }
     }`;

    let batchOrders = [];
    let order = null;
    let parcelId = null;

    await asyncForEach(idList, async (id) => {
      order = await prisma.order({ id: id }).$fragment(fragment);
      parcelId = await createParcel(order.prescription);
      batchOrders.push({
        addressId: order.shippoAddressId,
        parcelId: parcelId,
      });
    });

    const batch = await createBatch(batchOrders);

    console.log("Return Batch", batch);

    return { resultCode: "OK", batchAmount: 0 };
  },

  shipOrders: async (_, { idList }, { req, prisma }) => {
    const payload = await validateUser(req, true);

    let user = null;
    // Create Shippo Batch and process it
    // Update orders to shipped

    var shipments = [];
    let order = null;
    // Create Shipments
    await asyncForEach(idList, async (id) => {
      order = await prisma.order({ id: id });

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
    await asyncForEach(addresses, async (address) => {
      if (!address.shippoId || !address.email) {
        user = await prisma.address({ id: address.id }).user();
        input = {
          addressTwo: address.addressTwo,
          addressOne: address.addressOne,
          city: address.city,
          state: address.state,
          zipcode: address.zipcode,
          email: user.email,
          telephone: address.telephone,
        };
        updateRet = await updateAddress({
          user: user,
          newAddress: input,
          prisma: prisma,
        });
        console.log(updateRet);
      }
    });

    return { message: "OK" };
  },
  // updateOrders: (_, __, { req, prisma }) => {},
  validateUserAddress: async (_, __, { req, prisma }) => {
    const input = {
      name: "Brian Baker",
      addressOne: "352 Ambroise",
      addressTwo: "",
      city: "Newport Coast",
      state: "CA",
      zipcode: "92657",
      telephone: "9494138239",
      email: "brianbbaker.net",
    };

    const ret = await validateAddress(input);

    return { message: "OK" };
  },

  addInterest: async (_, { input }, { prisma }) => {
    await prisma.createInterest({ ...input });
    sendComingSoonMail({ email: input.email });
    sendActivityCopy({
      email: ["brian@bbaker.net", "careteam@victoryselect.com"],
      text: `Someone (${input.email}) added interest for ${input.category}.`,
    });
    return { message: "OK" };
  },

  testLiveConnection: async (_, __, { prisma }) => {
    const cardInput = {
      cardNumber: "372762278391011",
      cardExpiry: "11/24",
      cardCVC: "3091",
      firstName: "Brian",
      lastName: "Baker",
      zipCode: "92657",
      address: "352 Ambroise",
    };

    const savedCard = await saveCreditCard(cardInput);
    return { message: "OK" };
  },

  sendMessage(_, { message, phoneNumber }) {
    sendTextMessage(message, phoneNumber);
    return { message: "OK" };
  },
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
