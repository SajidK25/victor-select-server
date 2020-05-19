const sgMail = require("@sendgrid/mail");

const returnEmail = "careteam@victoryselect.com";

const sendMail = async (msg) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  let res = await sgMail.send(msg);
};

const sendAnEmail = ({ email, name, templateId, templateData }) => {
  const msg = {
    from: {
      email: returnEmail,
      name: "Victory Select",
    },
    reply_to: {
      email: returnEmail,
      name: "Victory Select",
    },
    personalizations: [
      {
        to: [{ name: name, email: email }],
        dynamic_template_data: {
          ...templateData,
        },
      },
    ],
    template_id: templateId,
  };
  sendMail(msg);
};

const sendResetMail = ({ email, name, url }) => {
  sendAnEmail({
    name: name,
    email: email,
    templateId: "d-025df4ee89e4452889bfea7f1f2a173a",
    templateData: {
      name: name,
      url: url,
    },
  });

  sendMail(msg);
};

const sendDeniedMail = ({ email, name }) => {
  const msg = {
    from: {
      email: returnEmail,
      name: "Victory Select",
    },
    reply_to: {
      email: returnEmail,
      name: "Victory Select",
    },
    personalizations: [
      {
        to: [
          {
            email: email,
          },
        ],
        dynamic_template_data: {
          name: name,
        },
        subject: "Important Message from VictorySelect",
      },
    ],
    template_id: "d-c7f1491219d447d4ae641d8a2555be66",
  };
  sendMail(msg);
};

const sendShippedMail = async ({ email }) => {
  const msg = {
    from: {
      email: returnEmail,
      name: "Victory Select",
    },
    reply_to: {
      email: returnEmail,
      name: "Victory Select",
    },
    personalizations: [
      {
        to: [
          {
            email: email,
          },
        ],
        dynamic_template_data: {
          order_number: "VS-E10923544",
          tracking_number: "1Z00W3Y80299999",
          tracking_url: "",
        },
        subject: "Your shipment from VictorySelect is on its way",
      },
    ],
    template_id: "d-98a420cabf1f49e8a22465c739807b84",
  };
  await sendMail(msg);
};

const sendWelcomeMail = ({ email, name }) => {
  const msg = {
    from: {
      email: returnEmail,
      name: "Victory Select",
    },
    reply_to: {
      email: returnEmail,
      name: "Victory Select",
    },
    personalizations: [
      {
        to: [
          {
            email: email,
          },
        ],
        dynamic_template_data: {
          name: name,
        },
        subject: "Welcome to VictorySelect",
      },
    ],
    template_id: "d-1ea2eba2ed044883a22824126b0f42a1",
  };
  sendMail(msg);
};

const sendComingSoonMail = ({ email }) => {
  sendAnEmail({
    name: "",
    email: email,
    templateId: "d-05724fe552a44257b89b05534b61e9ae",
    tepmateData: {},
  });
};

// const sendComingSoonMail = ({ email }) => {
//   const msg = {
//     from: {
//       email: returnEmail,
//       name: "Victory Select",
//     },
//     reply_to: {
//       email: returnEmail,
//       name: "Victory Select",
//     },
//     personalizations: [
//       {
//         to: [
//           {
//             email: email,
//           },
//         ],
//       },
//     ],
//     template_id: "d-05724fe552a44257b89b05534b61e9ae",
//   };
//   sendMail(msg);
// };

const sendActivityCopy = ({ email, text }) => {
  const msg = {
    from: {
      email: returnEmail,
      name: "Victory Select",
    },
    reply_to: {
      email: returnEmail,
      name: "Victory Select",
    },
    personalizations: [
      {
        to: [
          {
            email: "brian@bbaker.net",
          },
          {
            email: email,
          },
        ],
        subject: "Activity notification",
      },
    ],
    content: [{ type: "text/html", value: `<p>${text}</p>` }],
  };
  sendMail(msg);
};

const makeANiceEmail = (text) => `
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
  sendShippedMail,
  sendComingSoonMail,
  sendActivityCopy,
};
