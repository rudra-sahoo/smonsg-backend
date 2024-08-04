const { Kafka, Partitioners } = require('kafkajs');
const admin = require('../config/firebaseConfig');
const User = require('../models/userModel');

const kafka = new Kafka({
  clientId: 'kafkajs',
  brokers: ['localhost:9092'],
  createPartitioner: Partitioners.LegacyPartitioner,
});

const consumer = kafka.consumer({ groupId: 'message-group' });
const producer = kafka.producer();

const sendMessage = async (message) => {
  const { senderUsername, receiverUsername, message: text } = message;

  const receiver = await User.findOne({ username: receiverUsername });
  const sender = await User.findOne({ username: senderUsername });
  if (!receiver) {
    console.error(`Receiver ${receiverUsername} not found.`);
    return;
  }

  const senderFirstName = sender.firstName;
  const fcmToken = receiver.fcmToken;

  const payload = {
    token: fcmToken,
    notification: {
      title: `New Message from ${senderFirstName}`,
      body: text,
    },
    data: {
      type: 'message',
      senderUsername,
      receiverUsername,
      message: text,
    },
    android: {
      priority: 'high',
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
    },
  };

  try {
    await admin.messaging().send(payload);
  } catch (err) {
    console.error('Error sending message via Firebase:', err);
  }
};

const handleAcknowledgment = async (receiverUsername) => {
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.value.toString());
      } catch (err) {
        console.error(`Error parsing message from topic ${topic}:`, err);
        return;
      }

      if (parsedMessage.receiverUsername === receiverUsername) {
        await sendMessage(parsedMessage);

        // Commit the offset after processing
        await consumer.commitOffsets([
          { topic, partition, offset: (parseInt(message.offset, 10) + 1).toString() },
        ]);
      }
    },
  });
};

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topic: new RegExp('^[a-zA-Z0-9]+-[a-zA-Z0-9]+$'), // Only subscribe to topics that match this pattern
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.value.toString());
      } catch (err) {
        console.error(`Error parsing message from topic ${topic}:`, err);
        return;
      }

      await sendMessage(parsedMessage);

      // Commit the offset after processing
      await consumer.commitOffsets([
        { topic, partition, offset: (parseInt(message.offset, 10) + 1).toString() },
      ]);
    },
  });
};

module.exports = { runConsumer, handleAcknowledgment };
