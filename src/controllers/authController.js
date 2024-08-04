const fs = require('fs');
const path = require('path');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // For generating unique usernames
const { generateOTP, sendOTP } = require('../services/otpService/otpService'); // Import OTP service
const { generateToken } = require('../middlewares/authMiddleware'); // Import generateToken function
// Function to generate a unique 24-digit username
const generateUniqueUsername = async () => {
  let username;
  let user;

  do {
    username = crypto.randomBytes(12).toString('hex'); // Generate a 24-digit unique username
    user = await User.findOne({ username });
  } while (user); // Ensure username is unique

  return username;
};

// Signup function
const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, dob, gender } = req.body;

    // Validate gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender', success: false });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered. Please try to login.', success: false });
    }

    // Check if dob is provided and is a valid date
    if (!dob || isNaN(Date.parse(dob))) {
      return res.status(400).json({ message: 'Invalid date of birth', success: false });
    }

    // Access files from req.files
    const profilePicture = req.files['profilePicture'] ? req.files['profilePicture'][0] : null;
    const avatar = req.files['avatar'] ? req.files['avatar'][0] : null;

    if (!profilePicture && !avatar) {
      return res.status(400).json({ message: 'No files uploaded', success: false });
    }

    const username = await generateUniqueUsername();

    // Generate OTP
    const confirmationCode = generateOTP();

    // Create user object
    const newUser = new User({
      username,
      firstName,
      lastName,
      email,
      password, // Password will be hashed separately
      profilePicture: profilePicture ? `https://itsrudra.xyz/uploads/${firstName}_${lastName}/profileimage/${profilePicture.filename}` : null,
      avatar: avatar ? `https://itsrudra.xyz/uploads/${firstName}_${lastName}/avatarimage/${avatar.filename}` : null,
      confirmationCode,
      dob: new Date(dob), // Add this line
      gender // Save gender
    });

    // Hash the user's password
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    // Save user first
    await newUser.save();

    // Send OTP with `firstName` as `USER_NAME`
    await sendOTP(email, confirmationCode, 'signup', firstName);

    // Send response with the saved user data
    res.status(201).json({
      success: true,
      username: newUser.username,
      profilePicture: newUser.profilePicture,
      email,
      firstName,
      lastName
    });
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).json({ message: 'Error registering user', success: false, error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password', success: false });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password', success: false });
    }

    // Generate OTP
    const confirmationCode = generateOTP();

    // Update user's confirmationCode
    user.confirmationCode = confirmationCode;
    await user.save();

    // Send OTP with hardcoded reason as 'login'
    await sendOTP(email, confirmationCode, 'login', user.firstName);

    // Prepare response data
    const responseData = {
      success: true,
      userName: user.username,
      userProfileImage: user.profilePicture,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    // Send response
    res.status(200).json(responseData);

  } catch (err) {
    console.error('Error during login:', err); // Log any errors
    res.status(500).json({ message: 'Error logging in user', success: false, error: err.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, username, otp, fcmToken } = req.body;

    // Find user by email and username
    const user = await User.findOne({ email, username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or username', success: false });
    }

    // Check if OTP matches
    if (user.confirmationCode !== otp) {
      return res.status(400).json({ message: 'Invalid OTP', success: false });
    }

    // Save fcmToken to user model
    user.fcmToken = fcmToken;
    await user.save();

    // Clear confirmation code after successful verification
    user.confirmationCode = null;
    await user.save();

    // Generate JWT token using the existing generateToken function
    const token = generateToken(user);

    // Return response with user details and token
    res.status(200).json({
      message: 'OTP verified successfully',
      success: true,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      token, // Include JWT token
      profileImage: user.profilePicture,
      avatarImage: user.avatar,
      dob: user.dob,
      gender: user.gender,
      created: user.createdAt
    });
    

  } catch (err) {
    console.error('Error during OTP verification:', err);
    res.status(500).json({ message: 'Error verifying OTP', success: false, error: err.message });
  }
};
module.exports = {
  signup,
  login,
  verifyOtp
};
