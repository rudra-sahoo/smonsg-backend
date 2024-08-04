const fs = require('fs');
const path = require('path');

// Middleware to ensure directories exist
const ensureDirectoriesExist = (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) {
      throw new Error('First name and last name are required');
    }

    const userDir = path.join('uploads', `${firstName}_${lastName}`);
    const profileImageDir = path.join(userDir, 'profileimage');
    const avatarImageDir = path.join(userDir, 'avatarimage');

    // Ensure the main user directory and subdirectories exist
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    if (!fs.existsSync(profileImageDir)) {
      fs.mkdirSync(profileImageDir, { recursive: true });
    }
    if (!fs.existsSync(avatarImageDir)) {
      fs.mkdirSync(avatarImageDir, { recursive: true });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Error ensuring directories:', error);
    res.status(500).json({ message: 'Error ensuring directories' });
  }
};

module.exports = ensureDirectoriesExist;
