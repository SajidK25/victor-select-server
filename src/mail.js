const sgMail = require("@sendgrid/mail");

const sendAnEmail = async ({ email, html, text }) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: { email },
    from: "info@victoryselect.com",
    subject: "Sending with Twilio SendGrid is Fun",
    text: "and easy to do anywhere, even with Node.js",
    html: "<strong>and easy to do anywhere, even with Node.js</strong>"
  };
  sgMail.send(msg);
};

const sendMail = async msg => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  res = await sgMail.send(msg);
};

const sendResetMail = ({ email, name, url }) => {
  const msg = {
    from: {
      email: "brian@bbaker.net",
      name: "Victory Select"
    },
    reply_to: {
      email: "careteam@victoryselect.com",
      name: "Victory Select"
    },
    personalizations: [
      {
        to: [
          {
            email: email
          }
        ],
        dynamic_template_data: {
          name: name,
          url: url
        },
        subject: "Reset your password"
      }
    ],
    template_id: "d-025df4ee89e4452889bfea7f1f2a173a"
  };
  sendMail(msg);
};

const sendDeniedMail = ({ email, name }) => {
  const msg = {
    from: {
      email: "brian@bbaker.net",
      name: "Victory Select"
    },
    reply_to: {
      email: "careteam@victoryselect.com",
      name: "Victory Select"
    },
    personalizations: [
      {
        to: [
          {
            email: email
          }
        ],
        dynamic_template_data: {
          name: name
        },
        subject: "Important Message from VictorySelect"
      }
    ],
    template_id: "d-c7f1491219d447d4ae641d8a2555be66"
  };
  sendMail(msg);
};

const sendShippedMail = async ({ email }) => {
  const msg = {
    from: {
      email: "brian@bbaker.net",
      name: "Victory Select"
    },
    reply_to: {
      email: "info@victoryselect.com",
      name: "Victory Select"
    },
    personalizations: [
      {
        to: [
          {
            email: email
          }
        ],
        dynamic_template_data: {
          order_number: "VS-E10923544",
          tracking_number: "1Z00W3Y80299999",
          tracking_url: ""
        },
        subject: "Your shipment from VictorySelect is on its way"
      }
    ],
    template_id: "d-98a420cabf1f49e8a22465c739807b84"
  };
  await sendMail(msg);
};

const sendWelcomeMail = ({ email, name }) => {
  const msg = {
    from: {
      email: "brian@bbaker.net",
      name: "Victory Select"
    },
    reply_to: {
      email: "info@victoryselect.com",
      name: "Victory Select"
    },
    personalizations: [
      {
        to: [
          {
            email: email
          }
        ],
        dynamic_template_data: {
          name: name
        },
        subject: "Welcome to VictorySelect"
      }
    ],
    template_id: "d-1ea2eba2ed044883a22824126b0f42a1"
  };
  sendMail(msg);
};

const makeANiceEmail = text => `
  <div className="email" style="
    border: 1px solid black;
    padding: 20px;
    font-family: sans-serif;
    line-height: 2;
    font-size: 20px;
  ">
    <h2>Hello There!</h2>
    <p>${text}</p>
    <p>😘, Brian Baker</p>
  </div>
`;

// exports.transport = transport
module.exports = {
  sendResetMail,
  sendWelcomeMail,
  sendDeniedMail,
  sendShippedMail
};
