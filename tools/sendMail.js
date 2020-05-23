const nodemailer = require("nodemailer");
const fs = require("fs");
const Handlebars = require("handlebars");
const path = require("path");
const {
  email_from,
  email_to,
  email_pass,
  email_port,
} = require("../config/keys");
/**
 *
 * @param {Object} data 数据{key1: value1, key2: value2 }
 * @param {String} filename 邮件模板
 */
async function sendMail(data, filename) {
  var source = fs.readFileSync(
    path.join(__dirname, `../views/mail/${filename}`),
    "utf8"
  );
  // Create email generator
  var template = Handlebars.compile(source);

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.163.com",
    port: email_port,
    secure: email_port === 465 ? true : false, // true for 465, false for other ports
    auth: {
      user: email_from, // generated ethereal user
      pass: email_pass, // generated ethereal password
    },
  });
  // console.log(data);

  // send mail with defined transport object
  await transporter
    .sendMail({
      from: `"Crawler App" <${email_from}>`, // sender address
      to: `${email_to}`, // list of receivers
      subject: "订阅邮件", // Subject line
      html: template(data), // html body
    })
    .then(() => {
      console.log("mail sended");
    })
    .catch((err) => {
      console.error(err);
    });
}

module.exports = sendMail;
