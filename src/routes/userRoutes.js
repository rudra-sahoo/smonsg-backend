const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middlewares/authMiddleware');
const User = require('../models/userModel'); // Import User model
const {
  getUserByUsername,
  updateUser,
  generateAndSaveQR,
  getQRPathByUsername
} = require('../controllers/userController');

// Configure multer for file uploads with dynamic directories
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {

      // Fetch user to get firstName and lastName
      const user = await User.findOne({ username: req.params.username });

      if (!user) {
        console.error('User not found');
        return cb(new Error('User not found'), null);
      }

      const { firstName, lastName } = user;

      const fileDir = file.fieldname === 'profilePicture' ? 'profileimage' : 'avatarimage';
      const uploadPath = path.join('uploads', `${firstName}_${lastName}`, fileDir);

      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }


      cb(null, uploadPath);
    } catch (err) {
      console.error('Error in destination function:', err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    cb(null, `${Date.now()}${fileExt}`); // Unique file name
  }
});
const upload = multer({ storage });

// Route to fetch user by username
router.get('/:username' ,getUserByUsername);

// Route to update user details with file uploads
router.put('/:username',authenticateToken, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'avatar', maxCount: 1 }
]), updateUser);

// Route to generate and save QR code for a username
router.post('/:username/qrcode' , async (req, res) => {
  try {
    const { username } = req.params;
    const qrPath = await generateAndSaveQR(username);
    res.status(200).json({ success: true, qrPath });
  } catch (err) {
    console.error('Error generating or saving QR code:', err);
    res.status(500).json({ message: 'Error generating or saving QR code', success: false, error: err.message });
  }
});
router.get('/:username/qrcode', getQRPathByUsername);
module.exports = router;
