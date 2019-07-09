const sgMail = require('@sendgrid/mail')

// const transport = nodemailer.createTransport({
//   host: process.env.MAIL_HOST,
//   port: process.env.MAIL_PORT,
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASSWORD
//   }
// })

const sendAnEmail = ({ email, html, text }) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const msg = {
    to: { email },
    from: 'info@victoryselect.com',
    subject: 'Sending with Twilio SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>'
  }
  sgMail.send(msg)
}

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
`

// exports.transport = transport
exports.makeANiceEmail = makeANiceEmail
