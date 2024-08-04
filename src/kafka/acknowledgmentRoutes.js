const express = require('express');
const { handleAcknowledgment } = require('./kafkaConsumer');

const router = express.Router();

router.post('/acknowledgeMessage', async (req, res) => {
  const { receiverUsername } = req.body;
  if (!receiverUsername) {
    return res.status(400).json({ error: 'receiverUsername is required' });
  }

  try {
    await handleAcknowledgment(receiverUsername);
    res.status(200).json({ message: 'Acknowledgment received and next message sent' });
  } catch (err) {
    console.error('Error handling acknowledgment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
