// Download the helper library from https://www.twilio.com/docs/node/install
// Your Account Sid and Auth Token from twilio.com/console
// DANGER! This is insecure. See http://twil.io/secure

const client = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const sendTextMessage = (message, phoneNumber) => {
  client.messages
    .create({
      body: message,
      from: "+15128837003",
      to: "+1" + phoneNumber,
    })
    .then((message) => console.log(message.sid))
    .catch((err) => console.log(err));
};

module.exports = { sendTextMessage };
