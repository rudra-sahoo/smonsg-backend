// src/config/dbConfig.js
const mongoose = require('mongoose');
require('dotenv').config(); 
// MongoDB connection URL (from environment variables)
const dbURI = process.env.MONGO_URI;

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(dbURI, {
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit process with failure
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {

});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection disconnected');
});

// Export the connection function
module.exports = connectDB;
