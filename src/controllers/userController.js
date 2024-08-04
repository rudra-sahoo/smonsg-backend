const User = require('../models/userModel');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const updateUser = async (req, res) => {
    try {
        // Log the incoming request data
        
        // Extract fields from request body
        const { firstName, lastName, dob, gender } = req.body;

        // Extract files from request
        const profilePicture = req.files && req.files['profilePicture'] ? req.files['profilePicture'][0] : null;
        const avatar = req.files && req.files['avatar'] ? req.files['avatar'][0] : null;

        // Fetch user based on username parameter
        const user = await User.findOne({ username: req.params.username });

        // Log the found user
        if (!user) {
            return res.status(404).json({ message: 'User not found', success: false });
        }


        // Track updated fields
        const updatedFields = {};

        // Update user details if provided
        if (firstName) {
            user.firstName = firstName;
            updatedFields.firstName = firstName;
        }
        if (lastName) {
            user.lastName = lastName;
            updatedFields.lastName = lastName;
        }
        if (dob) {
            user.dob = new Date(dob);
            updatedFields.dob = user.dob;
        }
        if (gender) {
            user.gender = gender;
            updatedFields.gender = gender;
        }

        // Define base upload path
        const baseUploadPath = path.join('uploads', `${user.firstName}_${user.lastName}`);

        // Update profile picture if provided
        if (profilePicture) {
            const profilePicturePath = path.join(baseUploadPath, 'profileimage', profilePicture.filename);
            user.profilePicture = `https://itsrudra.xyz/uploads/${user.firstName}_${user.lastName}/profileimage/${profilePicture.filename}`;
            updatedFields.profilePicture = user.profilePicture;
        }

        // Update avatar if provided
        if (avatar) {
            const avatarPath = path.join(baseUploadPath, 'avatarimage', avatar.filename);
            user.avatar = `https://itsrudra.xyz/uploads/${user.firstName}_${user.lastName}/avatarimage/${avatar.filename}`;
            updatedFields.avatar = user.avatar;
        }

        // Save the updated user document
        await user.save();

        res.status(200).json({
            success: true,
            updatedFields
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Error updating user', success: false, error: err.message });
    }
};
const getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        // Extracting specific fields from the user object
        const { firstName, lastName, profilePicture, createdAt  } = user;

        res.status(200).json({ success: true ,user: {  username, firstName, lastName, profilePicture, createdAt },  });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Error fetching user', success: false, error: err.message });
    }
};
const generateAndSaveQR = async (username) => {
    try {
        // Fetch user details based on username from MongoDB using Mongoose
        const user = await User.findOne({ username });
        if (!user) {
            throw new Error(`User not found with username: ${username}`);
        }

        // Extract first name and last name from user document
        const { firstName, lastName } = user;

        // Define the FastAPI endpoint URL
        const apiUrl = 'http://127.0.0.1:8000/qr/';

        // Make a GET request to FastAPI to generate QR code for the username
        const response = await axios.get(`${apiUrl}${username}`);
        const qrBase64 = response.data.base64;

        // Convert base64 QR code to gif format
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        const qrPath = path.join('uploads', `${firstName}_${lastName}`, 'qr-codes', `${username}_qr.gif`);

        // Create directories if they don't exist
        const qrDir = path.dirname(qrPath);
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
        }

        // Write the gif file
        fs.writeFileSync(qrPath, qrBuffer);

        const qrUrl = `https://itsrudra.xyz/${qrPath}`; // Construct QR code URL with prefix

        return qrUrl;
    } catch (error) {
        console.error('Error generating or saving QR code:', error);
        throw error;
    }
};

const getQRPathByUsername = async (req, res) => {
    try {
        const { username } = req.params;

        // Fetch user details based on username from MongoDB using Mongoose
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        // Extract first name and last name from user document
        const { firstName, lastName } = user;

        // Define the path where the QR code is saved
        const qrPath = path.join('uploads', `${firstName}_${lastName}`, 'qr-codes', `${username}_qr.gif`);

        // Check if the QR code file exists
        if (fs.existsSync(qrPath)) {
            const qrUrl = `https://itsrudra.xyz/${qrPath}`; // Replace with your actual URL
            return res.status(200).json({ success: true, qrUrl });
        } else {
            return res.status(404).json({ message: 'QR code not found', success: false });
        }
    } catch (err) {
        console.error('Error fetching QR code path:', err);
        res.status(500).json({ message: 'Error fetching QR code path', success: false, error: err.message });
    }
};
module.exports = {
    getUserByUsername,
    updateUser,
    generateAndSaveQR,
    getQRPathByUsername
};
