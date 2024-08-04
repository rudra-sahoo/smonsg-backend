const User = require('../models/userModel');
const Friend = require('../models/friendModel');
const kafkaProducer = require('../kafka/kafkaProducer');

const sendMessage = async (req, res) => {
  const { senderUsername, receiverUsername, message } = req.body;

  try {
    // Fetch sender and receiver users from MongoDB
    const sender = await User.findOne({ username: senderUsername });
    const receiver = await User.findOne({ username: receiverUsername });

    if (!sender || !receiver) {
      console.error(`Sender ${senderUsername} or receiver ${receiverUsername} not found.`);
      return res.status(404).json({ message: 'Sender or receiver not found' });
    }

    // Check if the sender and receiver are friends with accepted status
    const friendship = await Friend.findOne({
      $or: [
        { requester: senderUsername, recipient: receiverUsername, status: 'accepted' },
        { requester: receiverUsername, recipient: senderUsername, status: 'accepted' },
      ],
    });

    if (!friendship) {
      console.error(`No accepted friendship found between ${senderUsername} and ${receiverUsername}.`);
      return res.status(403).json({ message: 'No accepted friendship found' });
    }

    // Send message to Kafka
    await kafkaProducer.send(senderUsername, receiverUsername, message);

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Error sending message' });
  }
};

module.exports = {
  sendMessage,
};