const User = require('../models/userModel');
const Friend = require('../models/friendModel');
const admin = require('firebase-admin');
const Agora = require('agora-access-token'); // Ensure this package is installed

// Initialize Agora Token Generator with your credentials
const agoraAppId = process.env.AGORA_APP_ID; // Fetch these from environment variables
const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;

const generateAgoraToken = (channelName, uid, role) => {
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600; // Token valid for 1 hour
  return Agora.RtcTokenBuilder.buildTokenWithUid(
    agoraAppId,
    agoraAppCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
};

const initiateCall = async (req, res) => {
  const { callerUsername, receiverUsername, callType } = req.body; // callType can be 'voice' or 'video'

  try {
    // Fetch caller and receiver users from MongoDB
    const caller = await User.findOne({ username: callerUsername });
    const receiver = await User.findOne({ username: receiverUsername });

    if (!caller || !receiver) {
      return res.status(404).json({ message: 'Caller or receiver not found' });
    }

    // Check if the caller and receiver are friends with accepted status
    const friendship = await Friend.findOne({
      $or: [
        { requester: callerUsername, recipient: receiverUsername, status: 'accepted' },
        { requester: receiverUsername, recipient: callerUsername, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: 'No accepted friendship found' });
    }

    const receiverFcmToken = receiver.fcmToken;

    // Generate Agora tokens and UIDs
    const channelName = `${callerUsername}_${receiverUsername}`;
    const callerUid = Math.floor(Math.random() * 100000); // Unique UID for the caller
    const receiverUid = Math.floor(Math.random() * 100000); // Unique UID for the receiver
    const callerRole = Agora.RtcRole.PUBLISHER; 
    const receiverRole = Agora.RtcRole.SUBSCRIBER; 
    const callerAgoraToken = generateAgoraToken(channelName, callerUid, callerRole);
    const receiverAgoraToken = generateAgoraToken(channelName, receiverUid, receiverRole);

    // Prepare the call notification payload for the receiver
    const receiverPayload = {
      token: receiverFcmToken,
      notification: {
        title: `Incoming ${callType.charAt(0).toUpperCase() + callType.slice(1)} Call`,
        body: `${caller.firstName} is calling you for a ${callType} call`
      },
      data: {
        type: 'call',
        callerUsername: callerUsername,
        receiverUsername: receiverUsername,
        callType: callType,
        agoraToken: receiverAgoraToken.toString(),
        channelName: channelName.toString(),
        callerUid: callerUid.toString(),
        receiverUid: receiverUid.toString()
      },
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10'
        }
      }
    };

    // Send the call notification to the receiver
    await admin.messaging().send(receiverPayload);

    // Return the call details to the initiator
    res.status(200).json({
      message: 'Call initiated successfully',
      agoraToken: callerAgoraToken.toString(),
      channelName: channelName.toString(),
      callerUid: callerUid.toString(),
      receiverUid: receiverUid.toString()
    });
    console.log('Agora Token:', callerAgoraToken);
    console.log('Agora Token Receiver:', receiverAgoraToken);
    console.log('Channel Name:', channelName);
    console.log('Caller UID:', callerUid);
    console.log('Receiver UID:', receiverUid);
    

  } catch (err) {
    console.error('Error initiating call:', err);
    res.status(500).json({ message: 'Error initiating call' });
  }
};

module.exports = {
  initiateCall,
};


