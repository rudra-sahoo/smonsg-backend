const express = require('express');
const router = express.Router();
const { sendFriendRequest, acceptFriendRequest, declineFriendRequest, getAllFriends , removeFriend, cancelRequest} = require('../controllers/friendController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Route to send a friend request
router.post('/send' , sendFriendRequest);

// Route to accept a friend request
router.post('/accept' , acceptFriendRequest);

// Route to decline a friend request
router.post('/decline' , declineFriendRequest);

// Route to get all friends of a user
router.get('/:username/friends', getAllFriends);

//Route to remove a friend
router.post('/remove', removeFriend);

//Route to cacel a request
router.post('/cancel', cancelRequest);

module.exports = router;
