const User = require('../models/userModel');
const Friend = require('../models/friendModel');
const admin = require('../config/firebaseConfig');

const sendNotification = async (token, title, body) => {
  try {
    if (!token) {
      console.error('FCM token is missing');
      return;
    }

   
    const response = await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      data: {
        type: 'friend' 
      }
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    if (error.code === 'messaging/invalid-recipient') {
      console.error('Invalid recipient token provided');
    }
    if (error.code === 'messaging/registration-token-not-registered') {
      console.error('Registration token is not registered');
    }
    // Add any other specific error codes you want to handle
  }
};
const sendFriendRequest = async (req, res) => {
  try {
    const { requesterUsername, recipientUsername } = req.body;


    const requester = await User.findOne({ username: requesterUsername });
    if (!requester) {
      return res.status(404).json({ message: 'Requester not found' });
    }

    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const existingRequest = await Friend.findOne({
      $or: [
        { requester: requester._id, recipient: recipient._id },
        { requester: recipient._id, recipient: requester._id }
      ],
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(409).json({ message: 'Friend request already exists' });
    }

    const friendRequest = new Friend({
      requester: requester.username,
      recipient: recipient.username,
      status: 'pending',
    });

    await friendRequest.save();

    if (recipient.fcmToken) {
      await sendNotification(recipient.fcmToken, 'Friend Request', `${requester.firstName} has sent you a friend request.`);
    } else {
      console.error(`Recipient ${recipientUsername} does not have an FCM token`);
    }

    if (requester.fcmToken) {
      await sendNotification(requester.fcmToken, 'Friend Request Sent', `Friend request sent to ${recipient.firstName}`);
    } else {
      console.error(`Requester ${requesterUsername} does not have an FCM token`);
    }

    res.status(201).json({ message: 'Friend request sent' });

  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ message: 'Error sending friend request' });
  }
};
// Decline Friend Request
const declineFriendRequest = async (req, res) => {
  try {
    const { requesterUsername, recipientUsername } = req.body;


    const requester = await User.findOne({ username: requesterUsername });
    const recipient = await User.findOne({ username: recipientUsername });

    if (!requester || !recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendRequest = await Friend.findOneAndDelete({
      $or: [
        { requester: requester.username, recipient: recipient.username, status: 'pending' },
        { requester: recipient.username, recipient: requester.username, status: 'pending' }
      ]
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (requester.fcmToken) {
      await sendNotification(requester.fcmToken, 'Friend Request Declined', `${recipient.firstName} has declined your friend request.`);
    }

    if (recipient.fcmToken) {
      await sendNotification(recipient.fcmToken, 'Friend Request Declined', `You have declined ${requester.firstName}'s friend request.`);
    }

    res.status(200).json({ message: 'Friend request declined' });

  } catch (err) {
    console.error('Error declining friend request:', err);
    res.status(500).json({ message: 'Error declining friend request' });
  }
};

// Accept Friend Request
const acceptFriendRequest = async (req, res) => {
  try {
    const { requesterUsername, recipientUsername } = req.body;


    const requester = await User.findOne({ username: requesterUsername });
    const recipient = await User.findOne({ username: recipientUsername });

    if (!requester || !recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendRequest = await Friend.findOneAndUpdate(
      {
        $or: [
          { requester: requester.username, recipient: recipient.username, status: 'pending' },
          { requester: recipient.username, recipient: requester.username, status: 'pending' }
        ]
      },
      { status: 'accepted' },
      { new: true }
    );

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found or already accepted' });
    }

    const existingMutualFriend = await Friend.findOne({
      $or: [
        { requester: requester.username, recipient: recipient.username, status: 'accepted' },
        { requester: recipient.username, recipient: requester.username, status: 'accepted' }
      ]
    });

    if (!existingMutualFriend) {
      await new Friend({
        requester: requester.username,
        recipient: recipient.username,
        status: 'accepted',
      }).save();
      await new Friend({
        requester: recipient.username,
        recipient: requester.username,
        status: 'accepted',
      }).save();
    }

    if (requester.fcmToken) {
      await sendNotification(requester.fcmToken, 'Friend Request Accepted', `${recipient.firstName} has accepted your friend request.`);
    }

    if (recipient.fcmToken) {
      await sendNotification(recipient.fcmToken, 'Friend Request Accepted', `You have accepted ${requester.firstName}'s friend request.`);
    }

    res.status(200).json({ message: 'Friend request accepted' });

  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ message: 'Error accepting friend request' });
  }
};

// Get All Friends
const getAllFriends = async (req, res) => {
  try {
    const { username } = req.params;


    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friends = await Friend.find({
      $or: [{ requester: username }, { recipient: username }],
    });

    const friendsWithDetails = [];

    for (const friend of friends) {
      const isRequester = friend.requester === username;
      const otherUserUsername = isRequester ? friend.recipient : friend.requester;

      const otherUser = await User.findOne({ username: otherUserUsername })
        .select('profilePicture firstName lastName');

      if (otherUser) {
        const friendEntry = {
          status: friend.status,
          username: otherUserUsername,
          profilePicture: otherUser.profilePicture,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          role: isRequester ? 'recipient' : 'requester'
        };

        friendsWithDetails.push(friendEntry);
      }
    }

    res.status(200).json(friendsWithDetails);

  } catch (err) {
    console.error('Error getting friends:', err);
    res.status(500).json({ message: 'Error getting friends' });
  }
};

// Remove Friend
const removeFriend = async (req, res) => {
  try {
    const { requesterUsername, recipientUsername } = req.body;


    const requester = await User.findOne({ username: requesterUsername });
    const recipient = await User.findOne({ username: recipientUsername });

    if (!requester || !recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendRelationship = await Friend.findOneAndDelete({
      $or: [
        { requester: requester.username, recipient: recipient.username, status: 'accepted' },
        { requester: recipient.username, recipient: requester.username, status: 'accepted' }
      ]
    });

    if (!friendRelationship) {
      return res.status(404).json({ message: 'Friend relationship not found' });
    }

    if (requester.fcmToken) {
      await sendNotification(requester.fcmToken, 'Friend Removed', `${recipient.firstName} has been removed from your friends list.`);
    }

    if (recipient.fcmToken) {
      await sendNotification(recipient.fcmToken, 'Friend Removed', `You have been removed from ${requester.firstName}'s friends list.`);
    }

    res.status(200).json({ message: 'Friend removed successfully' });

  } catch (err) {
    console.error('Error removing friend:', err);
    res.status(500).json({ message: 'Error removing friend' });
  }
};
const cancelRequest = async (req, res) => {
  try {
    const { requesterUsername, recipientUsername } = req.body;

    // Validate users
    const requester = await User.findOne({ username: requesterUsername });
    const recipient = await User.findOne({ username: recipientUsername });

    if (!requester || !recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find and delete the friend relationship in both possible orientations
    const friendRelationship = await Friend.findOneAndDelete({
      $or: [
        { requester: requester.username, recipient: recipient.username, status: 'pending' },
        { requester: recipient.username, recipient: requester.username, status: 'pending' }
      ]
    });

    if (!friendRelationship) {
      return res.status(404).json({ message: 'Friend relationship not found' });
    }

    // Send data-only notification to trigger frontend refresh
    const sendRefreshNotification = async (fcmToken) => {
      if (!fcmToken) {
        console.error('FCM token is missing');
        return;
      }


      try {
        const response = await admin.messaging().send({
          token: fcmToken,
          data: {
            action: 'refresh'
          }
        });

      } catch (error) {
        console.error('Error sending refresh notification:', error);
        if (error.code === 'messaging/invalid-recipient') {
          console.error('Invalid recipient token provided');
        }
        if (error.code === 'messaging/registration-token-not-registered') {
          console.error('Registration token is not registered');
        }
        // Add any other specific error codes you want to handle
      }
    };

    if (requester.fcmToken) {
      await sendRefreshNotification(requester.fcmToken);
    }

    if (recipient.fcmToken) {
      await sendRefreshNotification(recipient.fcmToken);
    }

    res.status(200).json({ message: 'Friend request cancelled successfully' });

  } catch (err) {
    console.error('Error cancelling friend request:', err);
    res.status(500).json({ message: 'Error cancelling friend request' });
  }
};

module.exports = {
  sendFriendRequest,
  declineFriendRequest,
  acceptFriendRequest,
  getAllFriends,
  removeFriend,
  cancelRequest,
};
