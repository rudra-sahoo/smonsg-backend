const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const User = require('../../models/userModel');

// Generate a 6-digit OTP
const generateOTP = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-digit OTP
};

// Read HTML template and replace placeholders
const generateEmailTemplate = (templateName, replacements) => {
  const filePath = path.join(__dirname, templateName);
  let htmlTemplate = fs.readFileSync(filePath, 'utf8');

  // Replace placeholders with actual values
  for (const key in replacements) {
    const placeholder = `{{${key}}}`;
    htmlTemplate = htmlTemplate.replace(new RegExp(placeholder, 'g'), replacements[key]);
  }

  return htmlTemplate;
};

// Send OTP via email
const sendOTP = async (email, otp, reason, firstName) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'rudra.workwith@gmail.com',
        pass: 'bqwr gazj tepc agti'
      }
    });

    // Determine the template based on the reason
    const templateName = reason === 'signup' ? 'signUp.html' :
                         reason === 'login' ? 'login.html' :
                         'resetPassword.html';

    // Generate the email content with the OTP code
    const replacements = {
      OTP_CODE: otp,
      USER_NAME: firstName,  // Added USER_NAME for firstName
      REASON: reason === 'signup' ? 'Welcome to Our Chatting App!' :
               reason === 'login' ? 'Welcome Back!' :
               'We are sorry you forgot your password.'
    };

    const htmlContent = generateEmailTemplate(templateName, replacements);

    const mailOptions = {
      from: 'yourgmail@gmail.com',
      to: email,
      subject: reason === 'signup' ? 'Welcome to Our Chatting App!' :
               reason === 'login' ? 'Welcome Back!' :
               'Password Reset Request',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP sent to:', email);
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Error sending OTP');
  }
};


// Update user's confirmation code
const updateConfirmationCode = async (email, code) => {
  try {
    await User.findOneAndUpdate({ email }, { confirmationCode: code });
  } catch (error) {
    console.error('Error updating confirmation code:', error);
    throw new Error('Error updating confirmation code');
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  updateConfirmationCode
};
