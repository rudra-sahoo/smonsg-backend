const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { signup, login, verifyOtp } = require('../controllers/authController');
//we have to renmve this line later
const { authenticateToken } = require('../middlewares/authMiddleware');

// Configure multer for file uploads with dynamic directories
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { firstName, lastName } = req.body;
    const fileDir = file.fieldname === 'profilePicture' ? 'profileimage' : 'avatarimage';
    const uploadPath = path.join('uploads', `${firstName}_${lastName}`, fileDir);

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    cb(null, `${Date.now()}${fileExt}`); // Unique file name
  }
});
const upload = multer({ storage });

// Signup route with multipart form-data
router.post('/signup', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'avatar', maxCount: 1 }
]), signup);

// Login route
router.post('/login', login);

// Verify OTP route
router.post('/verify-otp',verifyOtp);

module.exports = router;
