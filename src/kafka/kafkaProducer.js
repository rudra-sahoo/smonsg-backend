const { Kafka, Partitioners } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'kafkajs',
  brokers: ['localhost:9092'],
});

class KafkaProducer {
  constructor() {
    this.producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner  // Use legacy partitioner here
    });
    this.admin = kafka.admin();
    this.isConnected = false;
    this.connect();
  }

  async connect(retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        break;
      } catch (err) {
        console.error(`Error connecting Kafka Producer (attempt ${i + 1}):`, err);
        if (i === retries - 1) throw err;
        await new Promise(res => setTimeout(res, 2000)); // Wait before retrying
      }
    }
  }

  async checkTopicExists(topicName) {
    try {
      const topics = await this.admin.listTopics();
      return topics.includes(topicName);
    } catch (err) {
      console.error('Error checking topic existence:', err);
      return false;
    }
  }

  async createTopic(topicName) {
    try {
      await this.admin.createTopics({
        topics: [{ topic: topicName, numPartitions: 1 }],
      });
    } catch (err) {
      console.error('Error creating topic:', err);
    }
  }

  async send(senderUsername, receiverUsername, message) {
    if (!this.isConnected) {
      await this.connect();
    }
    const topicName = `${senderUsername}-${receiverUsername}`;
    const topicExists = await this.checkTopicExists(topicName);
    if (!topicExists) {
      await this.createTopic(topicName);
    }
    await this.producer.send({ topic: topicName, messages: [{ value: JSON.stringify({ senderUsername, receiverUsername, message }) }] });
  }
}

const kafkaProducer = new KafkaProducer();

module.exports = kafkaProducer;